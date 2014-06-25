%SOMVISQUALITY  Estimate quality measures for a self-organizing map.
%   ERR = SOMVISQUALITY(SM, X, LABLS, RDIR)
%   SM    SOM structure from 'somtrain'.
%   X     M x N matrix of training or validation data.
%   LABLS M x 1 vector or cell array of sample labels (optional).
%   RDIR  Results directory (optional).
%   ERR   Structure:
%         delta  M x N matrix of differences between a sample and
%                the corresponding BMU prototype.
%         ubook  m x N matrix of regional rate of change in codebook.
%         qbook  m x N matrix of regional quantization errors.
%         tbook  m x 1 vector of regional topographic errors.
%
%   IMPORTANT! If X differs from the SOM training set and contains
%   missing elements, the results may be inaccurate.
%
%   The X must be compatible with the SOM training data. Quantization
%   error is defined as the squared difference between a model and an
%   observation, divided by the input variances. Topographic error
%   is defined as the average Euclidean map distance between the 1st and
%   2nd BMUs, divided by the expected mean distance between any two
%   neighbors (d = 1.0787).
%
%   Output files:
%   ubook.*  Regional rate of change summed over all inputs,
%            sample hit matrix is depicted by grayscale circles.
%   qbook.*  Quantization errors averaged over all inputs (%).
%   tbook.*  Deviations (tbook - 1) from expected BMU gap (%).
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function err = somvisquality(sm, x, labls, rdir);
err = [];
if nargin < 2; x = []; end
if nargin < 3; labls = {}; end
if nargin < 4; rdir = ''; end
if isempty(rdir); rdir = '.'; end
if ~isfield(sm, 'codebook'); return; end
if ~isfield(sm, 'xscale'); return; end

% Check input data.
if size(sm.codebook, 2) ~= size(x, 2)
  error('X is not compatible with the SOM training data.');
end

% Check results directory.
if ~isempty(rdir)
  slash = '/';
  if ~isdir('/'); slash = '\\'; end
  while (length(rdir) > 1) & (rdir(end) == slash(1))
    rdir = rdir(1:(end-1));
  end
  rpath = [rdir slash(1)];
  if ~isdir(rpath); mkdir(rpath); end
  if ~isdir(rpath)
    error(sprintf('Could not open "%s".', rpath));
  end
end

% Check labels.
if numel(labls) ~= size(x, 1); labls = {}; end
if isempty(labls)
  labls = cell(size(x, 1), 1);
  for i = 1:numel(labls)
    labls{i} = sprintf('%05d', i);    
  end
end
if ~iscell(labls)
  tmp = cell(size(x, 1), 1);
  for i = 1:numel(tmp)
    tmp{i} = num2str(labls(i));    
  end
  labls = tmp;
end

% Apply input weigths.
[M, N] = size(x);
K = size(sm.codebook, 1);
codebook = sm.codebook; xscale = [];
if isfield(sm, 'xscale'); xscale = sm.xscale; end
if ~isempty(xscale)
  codebook = repmat(xscale(1, :), K, 1).*codebook;
  x = repmat(xscale(1, :), M, 1).*x;
end

% Impute missing values.
z = nnimpute(x, 1);

% Find best matching units.
[units, delta] = best_matches(codebook, z);

% Compute level of folding for the codebook.
ubook = estimate_fold(codebook, sm.msize);

% Track samples on the map.
upos = []; cl = []; r = [];
qbook = []; tbook = [];
if ~isempty(x)
  [qbook, tbook] = estimate_error(x, units, delta, sm.msize, sm.rho);
  upos = sample_markers(units, sm.msize);
end

% Show sample histogram of quantization errors.
if ~isempty(rdir)
  qerr2 = sum((delta.*delta)')';
  qerr = qerr2./(median(qerr2) + 1e-20);
  [svg, bb] = print_hist(log(0.3 + qerr), labls);
  svgprint([rpath 'qerrors.svg'], svg, bb);

  % Save individual errors.
  fname = [rpath 'qerrors.txt'];
  fid = fopen(fname, 'wt');
  fprintf(fid, 'ID\tQERROR\n');
  for i = 1:size(qerr, 1)
    fprintf(fid, '%s\t%.4e\n', labls{i}, qerr(i));
  end
  fclose(fid);
  fprintf(1, 'Quantization errors saved to "%s"\n', fname);
end

% Show U-book.
if ~isempty(rdir)
  u = mean(ubook');
  ulim = [0 3*mean(ubook(:))];
  u = reshape(u, sm.msize(2), sm.msize(1))';
  [svg, bb] = hexaimage(u, ulim, [], upos);
  width = sqrt((bb(3) - bb(1))*(bb(4) - bb(2)));
  svgprint([rpath 'ubook.svg'], svg, bb, 500/max(500, width));
  save_matrix([rpath 'ubook.txt'], u);
end

% Show Q-book.
if ~isempty(rdir)
  q = sparsestat(qbook');
  q = 100*reshape(q, sm.msize(2), sm.msize(1))';
  [svg, bb] = hexaimage(q);
  width = sqrt((bb(3) - bb(1))*(bb(4) - bb(2)));
  svgprint([rpath 'qbook.svg'], svg, bb, 500/max(500, width));
  save_matrix([rpath 'qbook.txt'], q);
end
  
% Show T-book.
if ~isempty(rdir)
  t = reshape(tbook, sm.msize(2), sm.msize(1))';
  t = 100*(t - 1);
  [svg, bb] = hexaimage(t);
  width = sqrt((bb(3) - bb(1))*(bb(4) - bb(2)));
  svgprint([rpath 'tbook.svg'], svg, bb, 500/max(500, width));
  save_matrix([rpath 'tbook.txt'], t);
end

% Create output structure.
err.delta = delta;
err.ubook = ubook;
err.qbook = qbook;
err.tbook = tbook;

return;

%----------------------------------------------------------------------------

function [units, delta] = best_matches(codebook, x);
units = []; delta = [];
Mc = size(codebook, 1);
BSIZE = 256;

% Make sure every sample will have a bmu.
[Mx, Nx] = size(x);
samples = condense(x, 0.9999, 1);
samples = setdiff((1:Mx)', samples);
x = [zeros(Mx, 1) x];
x(samples, 1) = randn(size(samples)); 
codebook = [zeros(Mc, 1) codebook];

% Eliminate missing values.
mask = ones(size(x));
missing = find(~(0*x == 0));
mask(missing) = 0;
x(missing) = 0;

% Find best matching units.
[Mx, Nx] = size(x);
units = NaN*ones(Mx, 2);
for i = 1:BSIZE:Mx
  istop = min(Mx, (i + BSIZE - 1));
  xi = x(i:istop, :);
  mi = mask(i:istop, :);

  % Compute pair distances for the current X block.
  ui = []; di = [];
  for k = 1:BSIZE:Mc
    kstop = min(Mc, (k + BSIZE - 1));
    uik = repmat((k:kstop), size(xi, 1), 1);
    ck = codebook(uik(1, :), :);
    ck2 = ck.^2;
    xc = xi*(ck');
    dik = (mi*(ck2') - 2*xc);
    ui = [ui uik];
    di = [di dik];
  end
  
  % Find best units for the current X block.
  for k = 1:size(ui, 1)
    [dummy, index] = sort(di(k, :));
    ui(k, :) = ui(k, index);
    di(k, :) = di(k, index);
  end
  units(i:istop, :) = ui(:, 1:2);
end

% Compute element distances.
delta = NaN*x;
for i = 1:Mx
  alpha = units(i, 1); 
  delta(i, :) = (x(i, :) - codebook(alpha, :));
end
delta = delta(:, 2:end); % remove constant

return;

%----------------------------------------------------------------------------

function ubook = estimate_fold(codebook, msize);
ubook = NaN*codebook;
Mc = size(codebook, 1);

% Collect potential neighbors.
nhood = repmat([-msize(2) 0 msize(2)]', 1, 5); % column neighbors
nhood = (repmat([-2 -1 0 1 2], 3, 1) + nhood); % row neighbors
nhood = reshape(nhood, 1, 15);
nhood = (repmat((1:Mc)', 1, 15) + repmat(nhood, Mc, 1));
nhood(find(nhood < 1)) = NaN;
nhood(find(nhood > Mc)) = NaN;

% Compute distances.
[xcoord, ycoord] = unit2coord((1:Mc)', msize);
[xhood, yhood] = unit2coord(nhood, msize);
dx = (xhood - repmat(xcoord, 1, 15));
dy = (yhood - repmat(ycoord, 1, 15));
d = sqrt(dx.^2 + dy.^2);

% Compute average deviations.
Nc = size(codebook, 2);
for i = 1:Mc
  di = d(i, :);
  ci = codebook(i, :);
  mask = find((di <= 1.12) & (di > 0));
  cneigh = codebook(nhood(i, mask), :);
  dneigh = repmat(di(mask)', 1, Nc);
  
  % Normalize by physical distance.
  delta = (cneigh - repmat(ci, size(cneigh, 1), 1));
  delta = (delta./dneigh).^2;
  ubook(i, :) = mean(delta);
end

return;

%----------------------------------------------------------------------------

function [qbook, tbook] = estimate_error(x, units, delta, msize, rho);
qbook = []; tbook = [];
[Md, Nd] = size(delta);

% Compute gaps between the first and second BMU.
[xcoord, ycoord] = unit2coord(units(:, 1:2), msize);
nnrad = (diff(xcoord').^2 + diff(ycoord').^2);
nnrad = sqrt(nnrad');

% Compute smoothed estimates for topographic error.
bmus = round([xcoord(:, 1) ycoord(:, 1)] - 0.25);
tbook = hexavalue(bmus, msize, nnrad, rho);
tbook = reshape(tbook', msize(1)*msize(2), 1);
tbook = tbook./1.0786893258332633;

% Normalize differences by input variances.
[mu, med, sigma] = sparsestat(x);
sigma = max(sigma.^2, 1e-20);
delta = delta.^2;
delta = delta./repmat(sigma, Md, 1);

% Compute unit quantization errors.
qbook = zeros(msize(1)*msize(2), Nd);
norms = zeros(msize(1)*msize(2), Nd);
for j = 1:Nd
  qj = hexavalue(bmus, msize, delta(:, j), rho);
  qbook(:, j) = reshape(qj', msize(1)*msize(2), 1);
end

return;

%-----------------------------------------------------------------------------

function upos = sample_markers(units, msize);
upos = [];
m = msize(1);
n = msize(2);

% Convert unit indices to map positions.
bmus = NaN*ones(size(units, 1), 2);
bmus(:, 1) = (floor((units(:, 1) - 1)/n) + 1);
bmus(:, 2) = (mod((units(:, 1) - 1), n) + 1);

% Count samples on each unit.
counts = zeros(m, n);
for i = 1:size(bmus, 1)
  xp = bmus(i, 1);
  yp = bmus(i, 2);
  counts(xp, yp) = (counts(xp, yp) + 1);
end

% Check if sample density can be shown as such.
cmax = max(counts(:));
if ~(cmax >= 10)
  upos = bmus;
  return;
end

% Create representative markers of sample density.
counts = ceil(8.9999*counts./cmax);
for i = 1:m
  for j = 1:n
    if counts(i, j) < 1; continue; end
    upos = [upos' repmat([i j]', 1, counts(i, j))]';
  end
end

% Show marker reduction factor.
r = size(bmus, 1)./size(upos, 1);
fprintf(1, 'Note! Sample markers correspond to %.2f samples.\n', r);

return;

%----------------------------------------------------------------------------

function [svg, bb] = print_hist(y, labels);
svg = []; bb = [];
mask = find(0*y(:, 1) == 0);
y = y(mask, 1);
labels = {labels{mask}};

% Determine number of bars.
res = ceil(2*log(2 + numel(y)));
t = (y - min(y));
t = (round(res.*t./max(t + 1e-20)) + 1);
res = (res + 1);

% Compute histogram.
range = (max(y) - min(y));
for k = 1:10
  hx = linspace(min(y), max(y), res);
  [h1, hx1] = hist(y, (hx - range/res/2));
  [h2, hx2] = hist(y, hx);
  [h3, hx3] = hist(y, (hx + range/res/2));
  hx = (hx1 + hx2 + hx3)/3;
  h = (h1 + h2 + h3)/3;
  if max(h) < numel(y)/3; break; end
  res = 2*res;
end

% Visualize bars.
[svg, bb, u, v] = svgbar(hx, h);
bb(4) = bb(4)/2; % non-negative bars

% Determine transformation from HX to U.
scale = (max(u) - min(u) + 1e-20)/(max(hx) - min(hx) + 1e-20);
shift = (u(1)/scale - hx(1));

% Compute (corrected) p-values for Gaussian hypothesis.
n = numel(y); z = y;
if n > 10
  z(1:round(0.1*n)) = NaN; 
  z(round(0.9*n):n) = NaN; 
end
[mu, med, sigma] = sparsestat(z);

% Show likely outliers.
x = scale*(y + shift);
yamp = (max(y) - med);
[dummy, order] = sort(-y);
for i = order'
  if(y(i) < (med + 3*sigma)) break; end
  cl = [0.95 0.25 0];
  h = (bb(4) - 12 - bb(4)*(med + yamp - y(i))/yamp);
  svg = [svg svgtext(x(i), h, labels{i}, [], cl, 0, 'end')];
  svg = [svg svgcircle(x(i), bb(4), 5, 2, cl)];
end

% Add white background.
bb = (bb + [-7 -7 7 20]);
x = bb([1 3 3 1]);
y = bb([2 2 4 4]);
svg = [svgpath(x, y, [], [], 0.99*[1 1 1], 1) svg];

return;

%----------------------------------------------------------------------------

function [xcoord, ycoord] = unit2coord(units, msize);

% Convert units to map positions.
n = msize(2);
xcoord = (floor((units - 1)/n) + 1);
ycoord = (mod((units - 1), n) + 1);

% Convert map positions to coordinates.
index = find(mod(xcoord, 2) == 0);
ycoord(index) = (ycoord(index) + 0.5);

return;

%-----------------------------------------------------------------------------

function save_matrix(fname, a);
[m, n] = size(a);
fid = fopen(fname, 'wt');
for j = 1:n
  fprintf(fid, '\tColumn%d', j);
end
for i = 1:m
  fprintf(fid, '\nRow%d', i);
  for j = 1:n
    fprintf(fid, '\t%g', a(i, j));
  end
end
fprintf(fid, '\n');
fclose(fid);
fprintf(1, 'Matrix saved to "%s".\n', fname);
return;

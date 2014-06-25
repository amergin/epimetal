%SOMVISPROTO  Visualize map demographics and store the results.
%   SOMVISPROTO(SM, MU, SIGMA, RDIR, CURV)
%   SM    SOM structure as prepared by 'somtrain'.
%   MU    1 x N vector of value offsets, where N equals the number
%         of SOM inputs (optional). 
%   SIGMA 1 x N vector of scale factors (optional).
%   RDIR  Result directory, without terminal slash (optional).
%   CURV  If true, curves instead of bar profiles will be drawn.
%
%   The transfomration by MU and SIGMA is done in reverse: first the
%   codebook is multiplied by SIGMA and then MU is added.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function somvisproto(sm, mu, sigma, rdir, curv);
if nargin < 2; mu = []; end
if nargin < 3; sigma = []; end
if nargin < 4; rdir = ''; end
if nargin < 5; curv = []; end
if isempty(rdir); rdir = '.'; end
if isempty(curv); curv = 0; end
if ~isfield(sm, 'codebook'); return; end
 
% Check results directory.
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

% Save input weights.
xscale = NaN;
if isfield(sm, 'xscale'); xscale = sm.xscale; end
if sum(diff(xscale) ~= 0)
  [svg, bb] = svgbar([], sm.xscale);
  svgprint(sprintf('%sprotoscale.svg', rpath), svg, bb);
  ascprint(sprintf('%sprotoscale.txt', rpath), sm.xscale, sm.xheader, 1);
end

% Create transformed prototypes.
header = sm.xheader;
prototypes = sm.codebook;
[m, n] = size(prototypes);
if isempty(mu); mu = zeros(1, n); end
if isempty(sigma); sigma = ones(1, n); end
prototypes = repmat(sigma, m, 1).*prototypes;
prototypes = (repmat(mu, m, 1) + prototypes);

% Group similar variables together.
if ~curv
  [u, s, coord] = svd(prototypes, 'econ');
  [dummy, order] = sort(coord(:, 1));
  prototypes = prototypes(:, order);
  if ~isempty(header); header = {header{order}}; end
  
  % Merge highly correlated variables.
  limit = 1;
  while size(prototypes, 2) > 30
    limit = 0.98*limit;
    [prototypes, header] = prune_variables(prototypes, header, limit);
    fprintf(1, 'Note! Correlated variables merged (r > %.2f).\n', limit);
  end
  n = size(prototypes, 2);
  if n ~= size(sm.codebook, 2)
    ascprint([rpath 'cliques.txt'], (1:n), header, 1);
  end
end

% Select rows and columns to visualize.
inx = []; upos = sm.upos;
m = sm.msize(1); n = sm.msize(2);
scale = sqrt(60/m/n);
rows = linspace(1, m, ceil(scale*m)); rows = unique(round(rows));
cols = linspace(1, n, ceil(scale*n)); cols = unique(round(cols));
for i = 1:size(upos, 1)
  if ~sum(upos(i, 1) == rows); continue; end
  if ~sum(upos(i, 2) == cols); continue; end
  inx = [inx i];     
end
if (numel(inx) ~= size(upos, 1))
  fprintf(1, 'Note! Reduced prototype visualization.\n');
end

% Adjust coordinates for the summary file.
pos = NaN*upos;
mx = numel(rows); ny = numel(cols);
pos(inx, :) = make_grid(upos(inx, :), mx, ny);

% Scale factor for prototypes to fill the gaps.
m = sm.msize(1); n = sm.msize(2);
scale = max([mx ny]./[m n]);

% Set color space.
[m, n] = size(prototypes);
cmap = austin(n + 2);
cmap = cmap(2:(n+1), :);
cfill = (0.4 + 0.6*cmap);
cstroke = (0.8*cmap).^2;

% Draw prototype plots.
fs = 10;
svglb = ''; svgprof = '';
bbprof = [NaN NaN NaN NaN];
amp = max(abs(prototypes(:)));
for i = inx
  
  % Draw prototype.
  if curv
    [u, v] = simplify([], prototypes(i, :), 500);    
    [svg, bb] = svgplot(u, v);
  else
    [svg, bb] = svgbar([], prototypes(i, :), amp, cfill, cstroke);
  end
  width = max((bb(3) - bb(1)), (bb(4) - bb(2)));
  fs = width/10;
  
  % Collect profiles to a single file.
  [svg, bb] = wrap_profile(svg, pos(i, :), upos(i, :), width, scale);
  bbprof(1) = min(bbprof(1), bb(1));
  bbprof(2) = min(bbprof(2), bb(2));
  bbprof(3) = max(bbprof(3), bb(3));
  bbprof(4) = max(bbprof(4), bb(4));
  svgprof = [svgprof svg];

  % Create label.
  x = bb(1);
  y = (bb(2) + bb(4) + 2*fs/3)/2; 
  label = sprintf('%d,%d', upos(i, 1), upos(i, 2));
  svglb = [svglb svgtext(x, y, label, fs, [], [], 'end')];
end

% Group labels and profiles.
svgprof = sprintf('\n<g id="profiles">\n%s</g>\n', svgprof);
svglb = sprintf('\n<g id="labels">\n%s</g>\n', svglb);

% Scale down summary canvas.
width = max((bbprof(3) - bbprof(1)), (bbprof(4) - bbprof(2)));
zoom = min(1000, width)/(width + eps);
bbprof = (bbprof + 0.5*[-fs -fs/5 fs/5 fs/5]/zoom);

% Add white background and save summary picture.
x = bbprof([1 3 3 1]);
y = bbprof([2 2 4 4]);
fname = sprintf('%sproto.svg', rpath);
svgprof = [svgpath(x, y, [], [], 0.99*[1 1 1], 1) svgprof];
svgprint(fname, [svgprof svglb], bbprof, zoom);

% Draw prototype legend.
n = size(prototypes, 2);
if numel(header) == n
  mrows = min(n, 2*ceil(sqrt(n)));
  ncols = ceil(n/mrows);
  
  % Arrange entries to grid.
  svg = ''; fs = 14; j = 1;
  dx = 0.7*[-1 1 1 -1].*fs;
  dy = 0.7*[1 1 -1 -1].*fs;
  for jp = 1:ncols
    for ip = 1:mrows
      if j > n; break; end
      name = header{j};
      if length(name) > 11; name = [name(1:10) '..']; end
      xp = 1.7*(jp - 1)*7*fs;
      yp = 1.7*(ip - 1)*fs;
      clF = cfill(j, :); clS = cstroke(j, :);
      svg = [svg svgpath((xp + dx), (yp + dy), 2, clS, clF, 1)];
      svg = [svg svgtext((xp + 1.1*fs), (yp + 0.3*fs), name, fs)];
      j = (j + 1);
    end
  end

  % Determine bounding box and save image.
  bb = (1.7*[-1 -1 7*ncols mrows].*fs + [-1 -1 10 1]);
  x = bb([1 3 3 1]); y = bb([2 2 4 4]);
  fname = sprintf('%sprotolegend.svg', rpath);
  svgprint(fname, [svgpath(x, y, [], [], 0.99*[1 1 1], 1) svg], bb);
end

return;

%-----------------------------------------------------------------------------

function [z, zhdr] = prune_variables(y, yhdr, rho);
z = []; cliques = {};

% Compute correlations.
[M, N] = size(y);
cc = corrcoef(nnimpute(y, 1));

% Convert to array.
k = 1;
clist = NaN*ones(1, numel(cc)); 
coord = NaN*ones(2, numel(cc));
for i = 1:size(cc, 1)
  cc(i, i) = NaN;
  for j = (i + 1):size(cc, 2)
    clist(k) = cc(i, j);
    coord(:, k) = [i j]';
    k = (k + 1);
  end
end

% Collect correlation cliques.
h = zeros(N, 1);
cliques = cell(N, 1);
[dummy, order] = sort(-abs(clist));
for k = order
  if ~(abs(clist(k)) > rho); break; end
  i = coord(1, k); j = coord(2, k); 
  hi = h(i); hj = h(j);
  if hi == 0; hi = i; end
  if hj == 0; hj = j; end  

  cliq = unique([cliques{hi} cliques{hj} i j]);
  if sum(cc(i, cliq) < rho); continue; end
  
  cliques{i} = cliq;
  h(i) = hi; h(j) = hj;
  if h(i) ~= i; cliques{h(i)} = []; end
  if h(j) ~= i; cliques{h(j)} = []; end
  h(cliques{i}) = i;
end

% Clear unnecessary entries.
mask = unique(h(find(h > 0)));
cliques = {cliques{mask}};
singles = setdiff((1:N), [cliques{:}]);
for j = 1:numel(singles)
  cliques = {cliques{:}, singles(j)};
end

% Create pruned data.
n = numel(cliques);
z = NaN*ones(M, n);
for j = 1:n
  cliq = cliques{j};
  if numel(cliq) > 1
    [u, s, coord] = svd(y(:, cliq)', 'econ');
    z(:, j) = coord(:, 1);
  else
    z(:, j) = y(:, cliq);
  end
end

% Create new headings.
if isempty(yhdr); return; end
n = numel(cliques); zhdr = cell(1, n);
for j = 1:n
  cliq = cliques{j};
  if numel(cliq) > 1; zhdr{j} = [zhdr{j} '(']; end
  for k = cliq
    if k ~= cliq(1); zhdr{j} = [zhdr{j} ', ']; end
    zhdr{j} = [zhdr{j} yhdr{k}];
  end
  if numel(cliq) > 1; zhdr{j} = [zhdr{j} ')']; end
end

return;

%-----------------------------------------------------------------------------

function pos = make_grid(pos, nx, ny);                   

% Find unique coordinates.
rx = unique(pos(:, 1));
ry = unique(pos(:, 2));

% Resample from grid.
px = linspace(min(rx), max(rx), numel(rx));
py = linspace(min(ry), max(ry), numel(ry));

% Update positions.
for k = 1:size(pos, 1)
  i = find(pos(k, 1) == rx);
  j = find(pos(k, 2) == ry);
  pos(k, :) = [px(i) py(j)];
end

return;

%-----------------------------------------------------------------------------

function [svgout, bb] = wrap_profile(code, pos, upos, width, scale);
x = 1.3*width*(pos(2) - mod(upos(1), 2)/2);
y = width*pos(1);
x = scale*x;
y = scale*y;
t = sprintf('\n<g id="%04d%04d.proto" ', upos(1), upos(2));
t = [t sprintf('transform="translate(%.3f, %.3f)">\n', x, y)];
svgout = [t code sprintf('</g>\n')];
bb = ([x y x y] + [0 0 width width]);
return;

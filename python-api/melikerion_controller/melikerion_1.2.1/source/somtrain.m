%SOMTRAIN  Train a self-organizing neural network.
%   [SM, BMUS, XI, ETA] = SOMTRAIN(SM, X, Y, NCYCL)
%   SM    SOM structure from 'somcreate'.
%   X     M x N matrix, where M is the number of samples and N
%         the number of variables.
%   Y     M x L matrix, where M is the number of samples and L
%         the number of target variables (optional).
%   NCYCL Maximum number of cycles within unsupervised
%         and supervised training, respectively (optional).
%   BMUS  M x 2 matrix of unit coordinates for each sample in X.
%   XI    M x N matrix, where missing values in X have been
%         estimated from the codebook.
%   ETA   M x L matrix of Y estimates.
%
%   New fields added to SM:
%         codebook - K x N matrix of initial unit prototypes,
%                    where K = MSIZE(1)*MSIZE(2).
%         xscale   - Effective scale of X.
%         yproto   - Prototype vectors for predicting Y.
%         niter    - Cumulative number of training iterations completed.
%
%   This function uses the batch version of Kohonen's self-organizing
%   algorithm and was inspired by the SOMTOOLBOX for Matlab. Supervised
%   analysis is performed by optimizing the effective scales of inputs.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [sm, bmus, xi, eta] = somtrain(sm, x, y, ncycl);
bmus = []; xi = []; eta = [];
if nargin < 3; y = []; end
if nargin < 4; ncycl = []; end

% Check matrices.
[M, N] = size(x);
[My, L] = size(y);
if size(sm.codebook, 2) ~= N
  error('Incompatible X.');
end
if ~isempty(y) && (My ~= M)
  error('Incompatible Y.');
end

% Estimate number of iterations.
if isempty(ncycl)
  ncycl = round(100 + size(sm.codebook, 1)/5);
end  

% Unsupervised batch learning.
neighs = sm.neighs; links = sm.links; codebook = sm.codebook;
[codebook, niter] = batch_learn(codebook, x, neighs, links, ncycl);
if isfield(sm, 'niter'); niter = (sm.niter + niter); end

% Supervised learning algorithm.
[codebook, n, xscale] = super_learn(codebook, x, y, neighs, links, ncycl);
niter = (niter + n);

% Restore original scale and finalize map.
[bmus, xi, units] = finish_map(codebook, sm.msize, x);

% Compute Y estimates.
[yproto, eta] = estimate_targets(codebook, neighs, links, units, xi, y);

% Update structure.
sm.xscale = xscale;
sm.yproto = yproto;
sm.niter = niter;
sm.codebook = codebook;

return;

%----------------------------------------------------------------------------

function [codebook, ctr] = batch_learn(codebook, x, neighs, links, niter);
[x, samples, mask] = value_check(x);
x = x(samples, :);
mask = mask(samples, :);

% Train the SOM using the whole data as one batch.
ctr = 0; st = [];
units = zeros(size(x, 1), 2);
while ctr < niter
  ctr = (ctr + 1);
  
  % Find two best matching units.
  units = best_matches(codebook, x, mask);
  
  % Compute new codebook without smoothing.
  oldbook = codebook;
  [codebook, normbook] = code_update(codebook, x, mask, units);
  
  % Smoothen and normalize prototypes.
  codebook = book_smooth(codebook, neighs, links);
  normbook = book_smooth(normbook, neighs, links);
  codebook = codebook./normbook;

  % Check if layout is stable.
  err = sum((codebook - oldbook).^2)./max(sum(codebook.^2), 1e-20);
  if max(err) < 1e-4; niter = ctr; end

  % Update training data.
  x = value_check(x, codebook, units);
  st = progmonit('somtrain:batch', ctr/niter, 5, st);
end
st = progmonit('somtrain:batch', 1, 5, st);

return;

%----------------------------------------------------------------------------

function [codebook, ctr, xscale] = super_learn(codebook, x, y, ...
                                               neighs, links, niter);
% Check if training data exists.
if isempty(y)
  ctr = 0; xscale = [];
  return;
end

% Check data.
[x, xsamp, xmask] = value_check(x);
[y, ysamp, ymask] = value_check(y);
samples = intersect(ysamp, xsamp);
x = x(samples, :); y = y(samples, :);
mask = [ymask(samples, :) xmask(samples, :)];
if numel(samples) < 20
  error('Not enough data');
end

% Find binary variables.
[dum1, dum2, bnom] = binarize(y, {}, 2);
bcols = find(0*bnom == 0);

% Initial scales and codebook.
[M, N] = size(x);
xscale = ones(1, N);

% Add targets to codebook.
[My, L] = size(y);
K = size(codebook, 1);
codebook = [codebook zeros(K, L)];

% Train the SOM with linear modeling of residuals.
ctr = 0; st = [];
units = zeros(size(x, 1), 2);
while ctr < niter
  ctr = (ctr + 1);

  % Rescale codebook and input matrix.
  t = repmat(xscale, M, 1).*x;
  tbook = repmat(xscale, K, 1).*codebook(:, 1:N);
  
  % Find two best matching units.
  units = best_matches(tbook, t, xmask);
  
  % Compute new codebook without smoothing.
  oldbook = codebook;
  [codebook, normbook] = code_update(codebook, [x y], mask, units);
  
  % Smoothen and normalize prototypes.
  codebook = book_smooth(codebook, neighs, links);
  normbook = book_smooth(normbook, neighs, links);
  codebook = codebook./normbook;
  
  % Determine better input scales by linear ridge regression.
  r = standize(codebook(units(:, 1), (N+1):end) - y);
  beta = (pinv(x'*x + sqrt(N)/M*eye(N))*x'*r)';
  if size(beta, 1) < 2; beta = [beta' beta']'; end
  beta = sqrt(sum(beta.^2)); beta = beta./mean(beta);
  
  % Update input scales.
  psi = max(0.7, sqrt(ctr/niter));
  xscale = (psi.*xscale + (1 - psi).*beta);
  
  % Check if layout is stable.
  err = sum((codebook - oldbook).^2)./max(sum(codebook.^2), 1e-20);
  if max(err) < 1e-6; niter = ctr; end
  
  % Update training data.
  t = value_check(t, tbook, units);
  st = progmonit('somtrain:super', ctr/niter, 5, st);
end
st = progmonit('somtrain:super', 1, 5, st);

% Remove targets from codebook.
codebook = codebook(:, 1:N);

return;

%----------------------------------------------------------------------------

function [bmus, xi, units] = finish_map(codebook, msize, x);
bmus = []; xi = []; units = [];
[Mc, Nc] = size(codebook);
[Mx, Nx] = size(x);

% Make sure every sample will have a bmu.
z = [zeros(Mx, 1) x];
cbook = [zeros(Mc, 1) codebook];

% Find missing values.
mask = ones(size(z));
missing = find(~(0*z == 0));
mask(missing) = 0;
z(missing) = 0;

% Find best and 2nd best matching units.
[units, deltas] = best_matches(cbook, z, mask);  

% Spread missing samples evenly.
epsi = std(z')'; nunits = msize(1)*msize(2);
samples = find(~(epsi > 0)); n = numel(samples);
units(samples, 1) = round(linspace(1, nunits, n))';

% Determine map coordinates.
bmus(:, 1) = (floor((units(:, 1) - 1)/msize(2)) + 1);
bmus(:, 2) = (mod((units(:, 1) - 1), msize(2)) + 1);

% Impute missing values.
values = find(0*x == 0);
xi = codebook(units(:, 1), :);
xi(values) = x(values);

return;

%----------------------------------------------------------------------------

function [yproto, eta] = estimate_targets(codebook, neighs, links, ...
                                          units, xi, y);
yproto = []; eta = [];
if isempty(y); return; end

% Compute Y prototypes.
[y, samples, mask] = value_check(y);
yproto = repmat(mean(y), size(codebook, 1), 1);
[yproto, ynorm] = code_update(yproto, y, mask, units);

% Smoothen and normalize prototypes.
yproto = book_smooth(yproto, neighs, links);
ynorm = book_smooth(ynorm, neighs, links);
yproto = yproto./max(ynorm, 1e-6);

% Compute quantization errors.
e1 = (codebook(units(:, 1), :) - xi).^2;
e2 = (codebook(units(:, 2), :) - xi).^2;
e1 = mean(e1')';
e2 = mean(e2')';
w = (1 - (e1./(e1 + e2)).^2);

% Estimate Y from prototypes.
eta = yproto(units(:, 1), :);

return;

%----------------------------------------------------------------------------

function [units, delta] = best_matches(codebook, x, mask);
[Mc, Nc] = size(codebook);
[Mx, Nx] = size(x);
BSIZE = 256;

% Find best matching units.
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

% Compute vector distances.
if nargout > 1
  delta = NaN*units;
  for i = 1:Mx
    alpha = units(i, 1);  
    beta = units(i, 2);
    index = find(mask(i, :));
    delta(i, 1) = mean((x(i, index) - codebook(alpha, index)).^2);
    delta(i, 2) = mean((x(i, index) - codebook(beta, index)).^2);
  end
  delta = sqrt(delta);
end

return;

%----------------------------------------------------------------------------

function [codebook, normbook] = code_update(oldbook, x, mask, units);
[Mc, Nc] = size(oldbook);
[Mx, Nx] = size(x);

% Create new codebook.
codebook = zeros(Mc, Nc);
normbook = zeros(Mc, Nc);
for i = 1:Mx
  k = units(i, 1);
  codebook(k, :) = (codebook(k, :) + mask(i, :).*x(i, :));
  normbook(k, :) = (normbook(k, :) + mask(i, :));
end

% Copy missing values from the old book.
missing = find(normbook == 0);
normbook(missing) = 1;
codebook(missing) = oldbook(missing);

return;

%----------------------------------------------------------------------------

function book = book_smooth(oldbook, neighs, links);
book = zeros(size(oldbook));
for i = 1:size(book, 1)
  nhood = neighs(i, :);
  for j = find(nhood > 0)
    book(i, :) = (book(i, :) + links(i, j).*oldbook(nhood(j), :));
  end
end
return;

%-----------------------------------------------------------------------------

function [xi, samples, mask] = value_check(x, codebook, units);
xi = []; samples = []; mask = [];
if nargin < 3
  codebook = [];
  units = [];
end

% Check sample number.
t = x;
if size(x, 2) > 1; t = max(x')'; end
samples = find(0*t == 0);
if numel(samples) < 10
  error('Not enough data.');
end

% Find missing values.
mask = zeros(size(x));
values = find(0*x == 0);
mask(values) = 1;

% Impute missing values from codebook.
if ~isempty(codebook)
  xi = codebook(units(:, 1), :);
  xi(values) = x(values);
  return;
end

% Replace missing values with means.
xi = max(sparsestat(x), 0);
xi = repmat(xi, size(x, 1), 1);
xi(values) = x(values);

return;

%SOMCREATE  Prepare a self-organizing map.
%   [SM, PC] = SOMCREATE(X, XHDR, MSIZE, RHO, BMUS)
%   X     M x N data matrix, where M is the number of samples and N
%         the number of variables.
%   XHDR  1 x N cell array of input variables names (optional).
%   MSIZE 1 x 2 vector of map dimensions (optional).
%   RHO   Neighborhood radius for map smoothing (optional).
%   BMUS  M x 2 matrix of sample positions (optional).
%   SM    SOM structure.
%   PC    M x n matrix of principal linear components (calculated only
%         if BMUS not available).
%
%   New fields added to SM:
%         msize    - 1 x 2 vector pf map dimensions.
%         codebook - K x N matrix of initial unit prototypes,
%                    where K = MSIZE(1)*MSIZE(2).
%         xheader  - Cell array of input variable names.
%         upos     - K x 2 vector of unit positions on the map grid.
%         rho      - Gaussian neighborhood radius.
%         neighs   - K x n matrix of neighbors for each unit,
%                    by codebook index.
%         links    - K x n matrix of weights that indicate the closeness
%                    between neighbors (closer means larger weight).
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [sm, pc] = somcreate(x, xhdr, msize, rho, bmus);
sm = []; pc = [];
if nargin < 2; xhdr = {}; end
if nargin < 3; msize = []; end
if nargin < 4; rho = []; end
if nargin < 5; bmus = []; end

% Check data matrix.
[M, N] = size(x);
if (M < 10) | (N < 3)
  error('Not enough data.')
end

% Check BMUs.
if ~isempty(bmus)
  if (size(bmus, 1) ~= M) | (size(bmus, 2) ~= 2)
    error('Incompatible BMUS.');
  end
end

% Estimate map size from BMUs.
if isempty(msize) & ~isempty(bmus)
  msize = max(bmus);
end

% Estimate optimal map size.
if isempty(msize)
  meff = sum(0*x(:) == 0)./numel(x);
  msize(1) = (1.6*log(meff) - 4);
  msize(2) = 1.25*msize(1);
  msize(1) = max(7, msize(1));
  msize(2) = max(9, msize(2));
  msize = round(msize);
  msize = (msize - mod(msize, 2) + 1);
end

% Set radius based on map size.
if isempty(rho)
  m = msize(1); n = msize(2);
  meff = sum(0*x(:) == 0)./max(size(x, 2), 1);
  rho = 10*m*n/max(1, meff);
  rho = min(sqrt(m*n)/6, rho);
  rho = max(1, rho);
end

% Pruned neighbor connectivity.
[neighs, links, upos] = neigh_links(msize, rho);

% Create initial layout.
if isempty(bmus)
  [codebook, pc] = pca_init(x, msize, (nargout > 1));
else
  codebook = smooth_init(x, msize, bmus, neighs, links);
end

% Create SOM structure.
sm.codebook = codebook;
sm.xheader = {xhdr{:}};
sm.msize = msize;
sm.rho = rho;
sm.neighs = neighs;
sm.links = links;
sm.upos = upos;

return;

%----------------------------------------------------------------------------

function [codebook, pc] = pca_init(x, msize, flag);
codebook = []; pc = [];
[M, N] = size(x);

% Make sure dataset is complete.
[z, cols] = ranktf(x);
if numel(cols) ~= N
  error('Empty columns detected.');
end
z = fast_impute(z);

% Fix order of rows and columns.
[mu, med, sigma] = sparsestat(x);
[dummy, rowmap] = sort(-sum((z.^2)'));
[dummy, colmap] = sort(-sigma);
z = z(rowmap, :); z = z(:, colmap);
t = x(rowmap, :); t = x(:, colmap);

% Principal component analysis in original space.
if flag; [u, s, pc] = svd(iranktf(z, t)', 'econ'); end

% Principal component analysis in rank space.
[u, s, dummy] = svd(z', 'econ');
if msize(1) > msize(2)
  u1 = -sqrt(s(1, 1)).*u(:, 1)';
  u2 = -sqrt(s(2, 2)).*u(:, 2)';
else
  u1 = -sqrt(s(2, 2)).*u(:, 2)';
  u2 = -sqrt(s(1, 1)).*u(:, 1)';
end

% Span the component planes according to PC1 and PC2.
m = msize(1); n = msize(2); mbook = m*n;
codebook = zeros(mbook, size(x, 2));
for i = 1:mbook
  wx = (mod((i - 1), m) + 1);
  wy = (floor((i - 1)/m) + 1);
  wx = (2*(wx - 1)/(m - 1) - 1);
  wy = (2*(wy - 1)/(m - 1) - 1);
  codebook(i, :) = (wx.*u1 + wy.*u2);
end
order = reshape((1:mbook), msize(2), msize(1))';
codebook(order(:)', :) = codebook;

% Equalize location.
cmed = repmat(median(codebook), mbook, 1);
codebook = (codebook - cmed);

% Equalize scale.
zamp = max(abs(z(:)));
camp = max(abs(codebook(:)));
codebook = zamp.*codebook./max(camp, 1e-10);

% Restore original scale and column ordering.
n = size(codebook, 2);
cols = (1:n); cols = cols(colmap);
codebook(:, cols) = iranktf(codebook, x);

return;

%----------------------------------------------------------------------------

function codebook = smooth_init(x, msize, bmus, neighs, links);

% Check sample number.
tmax = max(x')';
samples = find(0*tmax == 0);
if numel(samples) < 10
  error('Not enough data.');
end

% Convert BMUs to unit indices.
m = msize(1); n = msize(2); pos = (bmus - 1);
units = round(pos(:, 1)*n + mod(pos(:, 2), n) + 1);

% Create raw codebook.
codebook = zeros(m*n, size(x, 2));
normbook = zeros(m*n, size(x, 2));
for i = 1:size(x, 1)
  mask = find(0*x(i, :) == 0);
  if isempty(mask); continue; end
  k = units(i, 1);
  codebook(k, mask) = (codebook(k, mask) + x(i, mask));
  normbook(k, mask) = (normbook(k, mask) + 1);
end

% Smoothen and normalize prototypes.
codebook = book_smooth(codebook, neighs, links);
normbook = book_smooth(normbook, neighs, links);
codebook = codebook./normbook;

return;

%----------------------------------------------------------------------------

function [neighs, links, upos] = neigh_links(msize, rho);
neighs = []; links = []; upos = [];

% Trace positions to unit indices.
m = msize(1); n = msize(2);
pos2unit = reshape((1:(m*n)), n, m)';

% Determine prototype positions.
upos = [(1:(m*n))' (1:(m*n))'];
upos(:, 1) = (floor((upos(:, 1) - 1)/n) + 1);
upos(:, 2) = (mod((upos(:, 2) - 1), n) + 1);

% Compute unit coordinates on an isotropic grid.
coord = upos;
even = find(mod(coord(:, 1), 2) == 0);
coord(even, 2) = (coord(even, 2) + 0.5);
coord(:, 1) = sqrt(0.75).*coord(:, 1);

% Find neighbors.
nneigh = 0;
radius = ceil(2*rho + eps);
adjacents = cell(m*n, 1); 
for i = 1:m
  ax = max(1, (i - radius));
  bx = min(m, (i + radius));
  for j = 1:n
    ay = max(1, (j - radius));
    by = min(n, (j + radius));
    
    % Distance on the map.
    k = pos2unit(i, j);
    neighood = pos2unit(ax:bx, ay:by);
    neighood = neighood(:);
    dx = (coord(neighood, 1) - coord(k, 1));
    dy = (coord(neighood, 2) - coord(k, 2));
    d = sqrt(dx.*dx + dy.*dy);

    % Prune and sort neighborhood.
    perim = find(d <= 2*rho);
    neighood = neighood(perim);
    [d, order] = sort(d(perim));
    neighood = neighood(order);
    
    % Update neighbor list.
    nneigh = max(nneigh, numel(neighood));
    adjacents{k} = [neighood d]';
  end
end

% Create connection matrices.
neighs = NaN*ones(m*n, nneigh);
links = zeros(m*n, nneigh);
for i = 1:(m*n)
  stop = size(adjacents{i}, 2);
  neighs(i, 1:stop) = adjacents{i}(1, :);
  d = adjacents{i}(2, :);
  links(i, 1:stop) = exp(-0.5*(d./rho).^2);
end

return;

%----------------------------------------------------------------------------

function book = book_smooth(oldbook, neighs, links);
book = 0*oldbook;
for i = 1:size(book, 1)
  nhood = neighs(i, :);
  for j = find(nhood > 0)
    book(i, :) = (book(i, :) + links(i, j).*oldbook(nhood(j), :));
  end
end
return;

%---------------------------------------------------------------------------

function x = fast_impute(x);
[M, N] = size(x);
base = sparsestat(x);
for i = 1:M
  index = find(0*x(i, :) == 0);
  base(index) = x(i, index);
  if numel(index) == N; continue; end
  missing = setdiff((1:N), index);
  x(i, missing) = base(missing);
end
return;

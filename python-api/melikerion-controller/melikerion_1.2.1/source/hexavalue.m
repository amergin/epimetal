%HEXAVALUE  Estimate local averages and hit counts on a hexagonal grid.
%   [A, H] = HEXAVALUE(POS, MSIZE, Y, R)
%   POS    M x 2 matrix of grid positions.
%   MSIZE  1 x 2 vector (nrows, ncols) of map dimensions.
%   Y      M x 1 vector of sample values (optional).
%   R      Smoothing radius (optional).
%   A      Value matrix (i.e. external component plane), with
%          smoothing radius R.
%   H      Smoothed hit matrix.
%
%   This function uses pixel matrix layout, in which positions
%   correspond to pairs of (row, col) on the map grid.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [a, h] = hexavalue(pos, msize, y, r);
a = []; h = [];
if nargin < 3; y = []; end
if nargin < 4; r = []; end

% Check inputs.
if size(y, 1) < 1; y = NaN*ones(size(pos, 1), 1); end
if size(y, 1) ~= size(pos, 1)
  error('W and POS must have the same number of rows.');
end
y = y(:, 1);

% Remove missing values.
mask = find(0*y == 0);
if numel(mask) < 1
  a = NaN*ones(msize(1), msize(2));
  h = zeros(msize(1), msize(2));
  return;
end
y = y(mask);
pos = pos(mask, :);

% Check for missing or invalid positions.
if sum(0*pos == 0) < size(pos, 1)
  error('Missing or invalid positions detected.');
end
if sum(pos(:) < 1) | sum(pos(:, 1) > msize(1)) | sum(pos(:, 2) > msize(2))
  error('Invalid position detected.');
end

% Estimate smoothing radius.
len = sqrt(msize(1)*msize(2));
if numel(r) < 1; r = 5*len/sqrt(size(pos, 1)); end
r = min(r, len/3); r = max(r, 1e-6);

% Determine neighbors for each grid position.
[neighs, weights] = find_neighbors(msize, r);

% Convert positions to grid unit indices.
units = (pos - 1); n = msize(2);
indices = round(units(:, 1)*n + mod(units(:, 2), n) + 1);

% Compute hit and value matrices.
a = zeros(1, msize(1)*msize(2));
h = zeros(1, msize(1)*msize(2));
for i = 1:size(pos, 1)
  k = indices(i);
  mask = find(weights(k, :) > 0);
  nhood = neighs(k, mask);
  w = weights(k, mask);
  a(nhood) = (a(nhood) + w.*y(i));
  h(nhood) = (h(nhood) + w);
end
a = a./max(h, eps);
a(find(h == 0)) = NaN;

% Restore grid plane.
a = reshape(a', msize(2), msize(1))';
h = reshape(h', msize(2), msize(1))';

return;

%----------------------------------------------------------------------------

function [neighs, links] = find_neighbors(msize, rho);
neighs = []; links = [];

% Trace positions to unit indices.
m = msize(1); n = msize(2);
pos2unit = reshape((1:(m*n)), n, m)';

% Compute unit coordinates.
coord = [(1:(m*n))' (1:(m*n))'];
coord(:, 1) = (floor((coord(:, 1) - 1)/n) + 1);
coord(:, 2) = (mod((coord(:, 2) - 1), n) + 1);
even = find(mod(coord(:, 1), 2) == 0);
coord(even, 2) = (coord(even, 2) + 0.5);

% Adjust distance between rows to make isotropic grid.
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

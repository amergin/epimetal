%NNIMPUTE  Imputation by nearest neighbor. 
%   [Y, SUCC] = NNIMPUTE(X, ALPHA, MASK, P)
%   X     M x N data matrix, where M is the number of samples and N
%         the number of variables.
%   ALPHA Maximum allowed fraction of imputed fields (optional).
%   MASK  1 x N vector of variable weights for distance estimation (optional).
%   P     Distance norm parameter (optional).
%   Y     M x N imputed data matrix.
%   SUCC  m x 1 index vector of samples that were imputed or had
%         no missing fields.
%
%   Note that data is converted to z-scores during imputation. Use MASK
%   to impose a non-normalized distance calculation. If M is large, the
%   process is accelerated by using random subsets of X to find nearest
%   neighbors.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [y, succ] = nnimpute(x, alpha, mask, p)
y = []; succ = [];
[m, n] = size(x);

% Check inputs.
if nargin < 2; alpha = 0.1; end
alpha = max(0, alpha);
alpha = min(1, alpha);
limit = floor(alpha*(n - 0.01));
if nargin < 3; mask = ones(1, n); end
if length(mask) < n; mask = ones(1, n); end
mask = mask(1, 1:n);
if nargin < 4; p = 2; end	
p = max(0.1, p);
p = min(10.0, p);

% Compute statistics
[mu, med, sigma] = sparsestat(x);

% Imputation by nearest neighbors.
st = []; succ = []; xorig = x;
for i = 1:m
  xi = x(i, :);
  missing = find(~(0*xi == 0));
  if numel(missing) > limit; continue; end
  if isempty(missing)
    succ = [succ' i]';
    continue;
  end

  % Create sampling set.
  msamp = min(m, 1000);
  samples = shuffle((1:m)');
  samples = samples(1:msamp);
  xsamp = xorig(samples, :);
  
  % Compute neighbor distances.
  d = nnimpute_dist(xi, xsamp, mask./max(sigma, eps), p);
  [dummy, order] = sort(d);
  xsamp = xsamp(order, :);
  
  % Fill missing values.
  for k = 1:msamp
    if isempty(missing); break; end
    index = find(0*xsamp(k, :) == 0);
    index = intersect(missing, index);
    if isempty(index); continue; end
    xi(index) = xsamp(k, index);
    missing = setdiff(missing, index);
  end
  
  % Check that all missing values are filled.
  if ~isempty(missing); continue; end
  x(i, :) = xi;
  succ = [succ' i]';
  st = progmonit('nnimpute', i/m, 5, st);
end
progmonit('nnimpute', 1, 5, st);

% Store imputed values.
y = x;

return;

%-----------------------------------------------------------------------------

function d = nnimpute_dist(x, z, w, p);
[m, n] = size(z);

% Expand inputs and find missing values.
x = repmat(x, m, 1);
w = repmat(w, m, 1);
d = abs(w.*(z - x)).^p;
h = zeros(m, n);
h(find(d >= 0)) = 1;

% Compute sample distances.
d = max(abs(d).^p, 0);
d = sum(d')';
h = sum(h')';
d = d./max(h, 1);
d(find(h == 0)) = mean(d);
d = d.^(1/p);

return;

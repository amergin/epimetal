%PLSIMPUTE  Imputation by projection to latent structures. 
%   [Y, YPS] = PLSIMPUTE(X, NCOMP)
%   X     M x N data matrix, where M is the number of samples and N
%         the number of variables.
%   NCOMP Number of PLS components (optional).
%   Y     M x N imputed data matrix.
%   YPS   M x N matrix of cross-validation estimates.
%
%   Note that YPS is constructed from the imputed Y; it may exhibit
%   overfit due to the indirect information from imputed values.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [y, yps] = plsimpute(x, ncomp)
y = []; yps = [];
if nargin < 2; ncomp = []; end
cvflag = (nargout > 1);

% Normalize data
[z, cols, mu, sigma] = standize(x);

% Make first pass.
[m, n] = size(z); st = [];
for j = 1:n
  samples = find(0*x(:, j) == 0);
  missing = setdiff((1:m)', samples);
  if isempty(missing); continue; end

  % Check if enough data.
  [dummy, cols] = condense(x(samples, :), 0.9999, 0.9999);
  cols = setdiff(cols, j);
  zj = z(samples, j);
  zin = z(samples, cols);
  zmiss = z(missing, cols);
  if numel(zj) < 10; continue; end
  if sum(0*zin == 0) < 10; continue; end
  
  % Replace missing inputs with zeros.
  zin(find(~(0*zin == 0))) = 0;
  zmiss(find(~(0*zmiss == 0))) = 0;
  
  % Estimate missing outputs.
  beta = plsregress(zin, zj, ceil(ncomp/3));  
  z(missing, j) = zmiss*(beta.coeff);
  st = progmonit('plsimpute:screen', j/n, 5, st);
end

% Make second pass with more components.
st = [];
for j = 1:n
  samples = find(0*x(:, j) == 0);
  missing = setdiff((1:m)', samples);
  if isempty(missing); continue; end
  
  [dummy, cols] = condense(z(samples, :), 0, 0);
  cols = setdiff(cols, j);
  zj = z(samples, j);
  zin = z(samples, cols);
  if numel(zj) < 10; continue; end
  if numel(zin) < 10; continue; end
  
  beta = plsregress(zin, zj, ncomp);  
  z(missing, j) = z(missing, cols)*(beta.coeff);
  st = progmonit('plsimpute:trim', j/n, 5, st);
end

% Cross-validation.
st = []; v = NaN*z;
for j = 1:n
  if ~cvflag; continue; end
  samples = find(0*z(:, j) == 0);
  [dummy, cols] = condense(z(samples, :), 0, 0);
  cols = setdiff(cols, j);
  if numel(samples) < 10; continue; end
  [t, st] = plsimpute_cv(z(samples, cols), z(samples, j), ncomp, st);
  v(samples, j) = t;
end

% Restore original scale.
y = (repmat(sigma, m, 1).*z + repmat(mu, m, 1));
yps = (repmat(sigma, m, 1).*v + repmat(mu, m, 1));
progmonit('plsimpute', 1, 5, st);

return;

%------------------------------------------------------------------------------

function [yps, st] = plsimpute_cv(x, y, ncomp, st);

% Shuffle samples.
[M, N] = size(x);
disorder = shuffle((1:M)');
x = x(disorder, :);
y = y(disorder, :);
yps = NaN*y;

% Perform 10-fold cross validation.
incr = max(1, floor(M/10));
for i = 1:incr:M
  start = (i - 1);
  stop = min((M + 1), (i + incr));
  valids = i:(stop - 1);
  trains = setdiff((1:M), valids);
  xV = x(valids, :);
  yV = y(valids, :);
  xT = x(trains, :);
  yT = y(trains, :);
  
  % Estimate outcomes in validation set.
  bT = plsregress(xT, yT, ncomp);
  yps(valids, :) = xV*(bT.coeff);
  st = progmonit('plsimpute:cv', i/M, 5, st);
end

% Restore original order.
[dummy, order] = sort(disorder);
yps = yps(order, :);

return;

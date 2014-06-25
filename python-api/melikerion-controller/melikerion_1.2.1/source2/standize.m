%STANDIZE  Subtract mean and divide by standard deviation.
%   [Z, COLS, MU, SIG] = STANDIZE(X, RHO)
%   X     M x N data matrix, where M is the number of samples and N
%         the number of variables.
%   RHO   The maximum allowed fraction of missing samples per column.
%   Z     M x N matrix of standardized data.
%   COLS  Indices of accepted columns.
%   MU    Original means.
%   SIG   Original deviations.
%
%   Constant columns remain unaffected.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [x, cols, mu, sig] = standize(x, rho);
[M, N] = size(x);
mu = NaN*ones(1, N);
sig = NaN*ones(1, N);
cols = [];

if nargin < 2; rho = 0.9999; end
rho = rho(1);
if (rho >= 1.0) | (rho <= 0.0)
  disp('Error! standize.m: Invalid parameter value.');
  return;
end

% Center and scale data.
for j = 1:N
  z = x(:, j);
  index = find(z == x(:, j));
  if length(index) <= (1 - rho)*M; continue; end

  z = z(index);
  mu(j) = mean(z);
  sig(j) = std(z);
  if sig(j) < 1e-20
    sig(j) = 0;
  end

  % Subtract mean and normalize by standard deviation.
  if sig(j) > 0
    x(index, j) = (z - mu(j))./sig(j); 
  else
    continue;
  end

  cols = [cols j];
end

return;

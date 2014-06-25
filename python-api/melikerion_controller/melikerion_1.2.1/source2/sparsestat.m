%SPARSESTAT  Basic statistics for sparse data.
%   [MU, MED, SIGMA, CI] = SPARSESTAT(X, ALPHA)
%   X     M x N data matrix, where M is the number
%         of samples and N the number of variables.
%   ALPHA Confidence level.
%   MU    1 x N vector of variable means.
%   MED   1 x N vector of variable medians.
%   SIGMA 1 x N vector of variable standard deviations.
%   CI    2 x N vector of (1 - ALPHA)*100% CI for MU (optional).
%
%   If no ALPHA is available, 95% confidence interval is returned.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [mu, med, sigma, ci] = sparsestat(x, alpha);
mu = []; med = []; sigma = []; ci = [];
if nargin < 2; alpha = 0.05; end

% Check inputs.
[M, N] = size(x);
if M*N < 1; return; end

% Compute mean, median and standard deviation.
mu = NaN*ones(1, N);
med = NaN*ones(1, N);
sigma = NaN*ones(1, N);
ci = NaN*ones(2, N);
for j = 1:N
  mask = find(0*x(:, j) == 0);
  n = numel(mask);
  if n < 1; continue; end
  mu(j) = mean(x(mask, j));
  med(j) = median(x(mask, j));
  if n < 2; continue; end
  sigma(j) = std(x(mask, j));
  if nargout < 4; continue; end % prevent unnecessary computation
  d = funcmin(@spstat_energy, [1 2], [(n - 1) (1 - alpha)/2]);
  ci(:, j) = (mu(j) + [-1 1].*mean(abs(d)).*sigma(j)./sqrt(n))';
end

return;

%------------------------------------------------------------------------------

function e = spstat_energy(x, prm);
n = prm(1);
alpha = prm(2);
z = NaN*ones(size(x, 1), 1);
for k = 1:size(z, 1)
  zk1 = pdfstudent(linspace(0, x(k, 1), 100), n).*(x(k, 1)./100);
  zk2 = pdfstudent(linspace(0, x(k, 2), 100), n).*(x(k, 2)./100);
  z(k) = (sum(zk1) + sum(zk2))/2;
end
e = (z - alpha).^2;
return;

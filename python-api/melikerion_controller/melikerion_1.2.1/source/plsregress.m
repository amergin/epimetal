%PLSREGRESS  Projection to latent structures regression.
%   [BETA, ETA] = PLSREGRESS(X, Y, NCOMP)
%   X      M x N matrix of explanatory data, where M is the number
%          of samples.
%   Y      M x L matrix of outcomes.
%   NCOMP  Number of PLS components (optional).
%   BETA   Struct of model parameters:
%          beta.coeff - regression coefficients
%          beta.t     - X scores
%          beta.p     - X loadings
%          beta.c     - Y loadings
%   ETA    M x L matrix of model estimates of Y.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [beta, eta] = plsregress(x, y, ncomp);
beta = []; eta = [];
if nargin < 3; ncomp = []; end
if isempty(x); return; end
if isempty(y); return; end
if ncomp < 1; return; end
[M, Nx] = size(x);
[My, Ny] = size(y);

% Check inputs.
if M*Nx < 1; return; end
if M ~= My
  error('Incompatible X and Y.');
end

% Check number of components.
if isempty(ncomp); ncomp = round(log(M) + 1); end
ncomp = min([M Nx round(ncomp)]);
 
% Non-linear iterative partial least squares (NIPALS) algorithm.
e = x; f = y;
t = NaN*ones(M, ncomp);
p = NaN*ones(Nx, ncomp);
c = NaN*ones(Ny, ncomp);
for k = 1:ncomp
  [e, f, tk, pk, ck] = plsregr_nipals(e, f);
  t(:, k) = tk;
  p(:, k) = pk;
  c(:, k) = ck;
end

% Compute regression coefficients.
beta.coeff = pinv(p')*(c');
beta.t = t;
beta.p = p;
beta.c = c;

% Compute model predictions.
if nargout < 2; return; end
eta = x*(beta.coeff);

return;

%-----------------------------------------------------------------------------

function [e, f, t, p, c] = plsregr_nipals(e, f);

delta = 1e20;
counter = 0;
w = (std(e).*sign(mean(e)))';
while (delta > 1e-6) & (counter < 1000)
  w_old = w;
  t = e*w;                          % score vector for X
  t = t./max(eps, sqrt(sum(t.^2))); % normalize X scores
  c = (f')*t;                       % loading vector for Y
  u = f*c;                          % score vector for Y
  u = u./max(eps, sqrt(sum(u.^2))); % normalize Y scores
  w = (e')*u;                       % update weight vector
  w = w./max(eps, sqrt(abs(w)));    % normalize weights
  delta = sum(abs(w - w_old));      % check convergence
  counter = (counter + 1);
end

p = (e')*t;       % X loadings
b = (f')*t;       % Y loadings
e = (e - t*(p')); % update X
f = (f - t*(b')); % update Y

return;

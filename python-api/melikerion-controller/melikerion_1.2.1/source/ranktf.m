%RANKTF  Replace values with ranks.
%   [R, COLS] = RANKTF(X, RHO)   
%   X     M x N data matrix, where M is the number
%         of samples and N the number of variables.
%   RHO   Maximum allowed fraction of missing values per variable.
%   R     Normalized rank so that each variable has value range [-1, 1].
%   COLS  Indices of accepted columns.
%
%   Constant columns remain unaffected.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [r, cols] = ranktf(x, rho);
r = [];
cols = [];
[M, N] = size(x);
if M*N < 1
  return;
end
if M < 2
  error('X must have at least two rows.');
  return;
end
if nargin < 2
  rho = 0.99;
end

r = x;
for j = 1:N
  index = find(abs(x(:, j)) >= 0);
  n = length(index);
  if (1 - n/M) < rho
    t = r(index, j);
    [t, ranking] = sort(t);
    if t(1) < t(end)
      t(ranking) = ((1:n)' - 1);
      r(index, j) = 2*(t./max(t) - 0.5);
    end
    cols = [cols' j]';
  end
end

return;



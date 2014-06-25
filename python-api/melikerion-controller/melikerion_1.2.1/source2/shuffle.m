%SHUFFLE  Random column-major permutations.
%   [U, IND] = shuffle(X);
%   X     M x N data matrix, where M is the number
%         of samples and N the number of variables.
%   U     M x N shuffled data matrix.
%   IND   1 x N cell array of shuffled row indices.
%
%   Missing values are not moved.  
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [u, ind] = shuffle(x)
[m, n] = size(x);
u = NaN*ones(m, n);
ind = cell(1, n);
for j = 1:n
  mask = find(0*x(:, j) == 0);
  [dummy, index] = sort(rand(numel(mask), 1));
  u(mask, j) = x(mask(index), j);
  ind{j} = mask(index);
end
return;

%BINARIZE  Break nominal data into binary variables. 
%   [B, BHDR, BNOM] = BINARIZE(X, XHDR, NC)
%   X      M x N data matrix.
%   XHDR   1 x N cell array of variable names (optional).
%   NC     Maximum number of nominal categories (optional).
%   B      M x n binary matrix (as much as possible).
%   BHDR   1 x n cell array of variable names.
%   BNOM   1 x n vector of X category indicator values for each
%          binary variable, NaN if binarization failed.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [b, bhdr, bnom] = binarize(x, xhdr, nc);
b = []; bhdr = {}; bnom = [];
if nargin < 2; xhdr = {}; end
if nargin < 3; nc = []; end

% Default arguments.
if isempty(nc); nc = 8; end
if isempty(xhdr)
  xhdr = cell(1, size(x, 2));
  for j = 1:size(x, 2)
    xhdr{j} = sprintf('X%d', j);
  end
end
if ischar(xhdr); xhdr = {xhdr}; end

% Check inputs.
if numel(xhdr) ~= size(x, 2)
  error('X and XHDR do not match.');
end

% Process data.
for j = 1:size(x, 2)
  xj = x(:, j);
  mask = find(0*xj == 0);
  q = unique(xj(mask)); nq = numel(q);
  if nq < 1; continue; end

  % Continuous.
  if nq > nc
    b = [b xj];
    bhdr = {bhdr{:} xhdr{j}};
    bnom = [bnom' NaN]';    
    continue;
  end
  
  % Nominal.
  if nq > 2
    for k = 1:nq
      xjk = 0*xj;
      xjk(find(xj == q(k))) = 1;
      b = [b xjk];
      bhdr = {bhdr{:} sprintf('%sgroup%d', xhdr{j}, q(k))};
      bnom = [bnom' q(k)]';
    end
    continue;
  end

  % Binary.
  if nq == 2
    xj(find(x(:, j) == q(1))) = 0;
    xj(find(x(:, j) == q(2))) = 1;
    b = [b xj];
    bhdr = {bhdr{:} xhdr{j}};
    bnom = [bnom' q(2)]';
    continue;
  end
  
  % Constant.
  b = [b xj];
  bhdr = {bhdr{:} xhdr{j}};
  bnom = [bnom' NaN]';
end

return;

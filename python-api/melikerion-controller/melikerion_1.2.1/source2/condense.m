%CONDENSE  List rows and columns with sufficient data.
%   [ROWS, COLS] = CONDENSE(X, EPSI, RHO)
%   X     M x N data matrix, where M is the number of samples and N
%         the number of variables.
%   EPSI  The maximum allowed fraction of missing samples per row.
%   RHO   The maximum allowed fraction of missing samples per
%         column. This is computed first and the rows are checked
%         from the remainder.
%   ROWS  Column vector of row indices.
%   COLS  Row vector of column indices.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [rows, cols] = condense(x, epsi, rho);
rows = [];
cols = [];

if nargin < 2
  epsi = 0.1;
  rho = 0.1;
end
if nargin < 3
  rho = 0.1;
end
epsi = min(1, max(0, epsi(1)));
rho = min(1, max(0, rho(1)));

% Find columns.
M = size(x, 1);
for j = 1:size(x, 2)
  index = find(0*x(:, j) == 0);
  if numel(index) < (1 - rho)*M; continue; end
  cols = [cols j];
end
if numel(cols) < 1
  return;
end

% Find rows.
N = numel(cols);
for i = 1:size(x, 1)
  index = find(0*x(i, cols) == 0);
  if numel(index) < (1 - epsi)*N; continue; end
  rows = [rows' i]';
end

return;

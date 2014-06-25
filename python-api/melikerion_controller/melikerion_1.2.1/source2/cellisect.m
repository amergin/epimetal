%CELLISECT  Intersection between two cell arrays of strings.  
%   [C, IA, IB] = CELLISECT(A, B)
%   A      One-dimensional cell array of M strings.
%   B      One-dimensional cell array of N strings.
%   C      Sorted cell array of n strings.
%   INDA     Row vector: C = {A{IA}}.
%   INDB     Row vector: C = {B{IB}}.
%   
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [c, indA, indB] = cellisect(a, b)
c = {}; indA = []; indB = [];

% Check inputs.
nA = numel(a); nB = numel(b);
if nA*nB < 1; return; end
if ischar(a); a = {a}; end
if ischar(b); b = {b}; end

% Sort set union.
u = {a{:}, b{:}};
ranks = [(1:nA) (1:nB)];
source = [ones(1, nA) 2*ones(1, nB)];
[u, order] = sort(u);
source = source(order);
ranks = ranks(order);

% Create two sets where matching items have identical rank.
pos = 1;
rA = []; rB = [];
if source(1) == 1; rA = 1; end
if source(1) == 2; rB = 1; end
for i = 2:numel(u)
  if ~strcmp(u(i), u(i-1)); pos = i; end
  if source(i) == 1; rA = [rA pos]; end
  if source(i) == 2; rB = [rB pos]; end 
end

% Compute intersection with the codes.
[c, indA, indB] = intersect(rA, rB);
ranksA = ranks(find(source == 1));
ranksB = ranks(find(source == 2));

% Convert codes to strings and indices in the original files.
c = {u{c}};
indA = ranksA(indA);
indB = ranksB(indB);

return;

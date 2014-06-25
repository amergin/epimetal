%RHODO  Cool-tinted red-white-blue colormap. 
%   C = RHODO(M)
%   M      Color resolution (optional).
%   C      M x 3 matrix of colors.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function c = rhodo(M);
c = [];
if nargin < 1; M = 250; end
M = max(3, M);
t = (0:(M - 1))'./(M - 1);

% Red.
r = 2*t;
r(find(r > 1)) = 1;

% Green.
g = pdfgauss(t, 0.5, 0.3);
g = g./max(g);

% Blue.
b = 2*(1 - t);
b(find(b > 1)) = 1;

% Final transformation.
c = [r g b].^1.5;

return;

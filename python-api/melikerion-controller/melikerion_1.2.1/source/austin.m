%AUSTIN  A less colourful variant of miami colormap. 
%   C = AUSTIN(M)
%   M      Color resolution (optional).
%   C      M x 3 matrix of colors.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function c = austin(M);
c = [];
if nargin < 1; M = 250; end
if M < 3
  error('Minimum color resolution is 3.');
end
M = ceil(M(1));

% Create colormap.
n = ceil(M/2);
up = ones(1, n);
down = zeros(1, n);
asc = linspace(0, 1, n);
desc = linspace(1, 0, n);
r = [up   up   desc down down asc ]';
g = [down asc  up   up   desc down]';
b = [desc down down asc  up   up  ]';

% Finalize base palette.
n = size(r, 1);
c = (0.1 + 0.8999*[r g b]).^2;
index = ceil(linspace(0.15*n, 0.9*n, (M + 1)));
c = c(index(1:M), :);

% Make center section slightly pale.
w = pdfgauss((1:M)', M/2, M/4);
w = (w - min(w));
w = 0.5*w./max(w);
w = repmat(w, 1, 3);
c = (c + w);
c(find(c > 1)) = 1;

% Flip upside-down.
c = flipud(c);

return;

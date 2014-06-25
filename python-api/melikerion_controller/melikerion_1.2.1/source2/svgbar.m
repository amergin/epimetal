%SVGBAR  Create bar plot.
%   [SVG, SVGBB, U, V] = SVGBAR(X, Y, AMP, CFILL, CSTRO)
%   X      1 x N vector of unique bar centers (optional).
%   Y      1 x N vector of bar heights.
%   AMP    Maximum absolute bar height, AMP >= max|y| (optional).
%   CFILL  N x 3 matrix of bar fill colors (optional).
%   CSTRO  N x 3 matrix of bar outline colors (optional).
%   SVG    Scalable Vector Graphics code as character string.
%   SVGBB  SVG bounding box dimensions: [x1 y1 x2 y2].
%   U      1 x N vector of x-coordinates on the canvas.
%   V      1 x N vector of y-coordinates on the canvas.
%
%   Bars are scaled and flipped to fit on a 500x500px canvas, and
%   the x-axis is positioned at y = 250. Note that bars are also
%   flipped in order to make them upright in SVG.
%   Aspect ratio is not preserved.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%

function [svg, svgbb, u, v] = svgbar(x, y, amp, cfill, cstro);
svg = ''; svgbb = []; u = []; v = [];
if nargin < 3; amp = []; end  
if nargin < 4; cfill = []; end  
if nargin < 5; cstro = []; end  
RX = 500;
RY = 500;

% Check inputs.
if isempty(x); x = (1:size(y, 2)); end
if size(x, 2) ~= size(y, 2)
  error('X and Y must have the same number of columns.');
end
if size(x, 2) < 2; return; end

% Sort data.
[dummy, index] = unique(x(1, :));
if numel(index) ~= size(x, 2)
  error('X must by unique.');
end
order = (1:numel(index));
order = order(index);
x = x(1, index);
y = y(1, index);
tf = [0 0 1 1];

% Check viewbox.
if isempty(amp); amp = max(abs(y)); end
if amp < max(abs(y))
  error('AMP is too small.');
end

% Check colors.
if isempty(cfill); cfill = 0.8*ones(numel(x), 3); end
if (size(cfill, 1) ~= numel(x)) | (size(cfill, 2) ~= 3) 
  error('CFILL has wrong size.');
end
if isempty(cstro); cstro = (0.9*cfill).^2; end
if (size(cstro, 1) ~= numel(x)) | (size(cstro, 2) ~= 3) 
  error('CSTRO has wrong size.');
end

% Scale and shift coordinates to standard box.
scale = 1./max((x(end) - x(1)), 1e-20);
u = (x - x(1));
u = RX*scale*u;
shift = max([amp 1e-20]);
v = (y - shift);
scale = -0.5./shift;
v = RY*scale*v;

% Determine bar width and adjust x-coordinates accordingly.
width = min(diff(u));
scale = RX/(RX + 0.999999*width);
u = scale*(u + width/2);
width = scale*width;
lwidth = 0.05*(width + eps).^(1.2);

% Draw bars.
for j = find(0*v == 0)
  xp = (u(j) + 0.38*[-1 1 1 -1].*width);
  yp = [v(j) v(j) RY/2 RY/2];
  svg = [svg svgpath(xp, yp, lwidth, cstro(j, :), cfill(j, :), 1)];
end
svgbb = [0 0 RX RY];

% Restore original order.
u(order) = u;
v(order) = v;

return;

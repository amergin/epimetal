%SVGPRINT  Create curve plot.
%   [SVG, SVGBB] = SVGPLOT(X, Y, ...)
%   X      1 x N or M x N matrix of X-coordinates.
%   Y      M x N matrix of Y-coordinates for M curves.
%   ...    Argument pairs of X and Y coordintes as above,
%          M and N need not be constant.
%   SVG    Scalable Vector Graphics code as character string.
%   SVGBB  SVG bounding box dimensions: [x1 y1 x2 y2].
%
%   Curves are scaled and flipped to fit on an automatically sized canvas.
%   Aspect ratio is preserved.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [svg, svgbb] = svgplot(varargin);
svg = ''; svgbb = [];

% Unpack curve data.
xy = {}; nmax = 0;
box = [NaN NaN NaN NaN];
for j = 1:2:(nargin-1)
  x = varargin{j};
  y = varargin{j+1};
  if numel(x).*numel(y) < 1; continue; end
  if size(x, 2) ~= size(y, 2)
    msg = sprintf('Arguments %d and %d ', j, (j+1));
    msg = [msg 'must have same number of columns.'];
    error(msg);
  end
  if size(x, 1) == 1
    x = repmat(x, size(y, 1), 1);
  end
  if size(x, 1) ~= size(y, 1)
    msg = sprintf('Arguments %d and %d ', j, (j+1));
    msg = [msg 'must have compatible number of rows.'];
    error(msg);
  end
  for i = 1:size(x, 1)
    xy{numel(xy)+1} = [x(i, :)' y(i, :)']'; 
    box(1) = min([box(1) x(i, :)]);
    box(3) = max([box(3) x(i, :)]);
    box(2) = min([box(2) y(i, :)]);
    box(4) = max([box(4) y(i, :)]);
  end
  nmax = max(nmax, size(x, 2));
end

% Set canvas size.
if nargout < 2; svgbb = [0 0 600 480]; end
if isempty(svgbb)
  svgbb = round([0 0 nmax/2 nmax/3]);
end

% Scale curves to fit on the screen.
width = (box(3) - box(1));
height = (box(4) - box(2));
scaleX = svgbb(3)/max(width, eps);
scaleY = svgbb(4)/max(height, eps);
for j = 1:numel(xy)
  xy{j}(1, :) = scaleX.*(xy{j}(1, :) - box(1));
  xy{j}(2, :) = scaleY.*(xy{j}(2, :) - box(2));  
  xy{j}(2, :) = (svgbb(4) - xy{j}(2, :));
end

% Print curves to string.
cmap = color_palette(numel(xy));
for j = 1:numel(xy)
  x = xy{j}(1, :);
  y = xy{j}(2, :);
  cl = 0;
  if (x(end) == x(1)) & (y(end) == y(1))
    if (numel(unique(x)) > 1) & (numel(unique(y)) > 1)
      x = x(2:end); y = y(2:end);
      cl = 1;
    end
  end
  svg = [svg svgpath(x, y, [], cmap(j, :), [], cl)];
end

return;

%-----------------------------------------------------------------------------

function cmap = color_palette(n);
if n < 3; n = 3; end;

% Create colormap.
up = ones(1, n);
down = zeros(1, n);
asc = linspace(0, 1, n);
desc = linspace(1, 0, n);
r = [asc  up   up   desc down down]';
g = [down down asc  up   up   desc]';
b = [up   desc down down asc  up  ]';

% Choose palette.
cmap = [r g b].^(0.9);
index = round(linspace(1, size(cmap, 1), (n + 1)));
cmap = cmap(index(1:n), :);

return;

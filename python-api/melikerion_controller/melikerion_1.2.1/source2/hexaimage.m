%HEXAIMAGE  Create image with hexagonal pixels.
%   [SVG, SVGBB] = HEXAIMAGE(A, ALIM, CMAP, POS, LABELS, LSIZE)
%   A      M x N data matrix.
%   ALIM   1 x 2 vector of data range (optional).
%   CMAP   K x 3 colormap matrix (optional).
%   POS    m x 2 matrix of label positions (optional).
%   LABELS m x 1 cell array of strings or
%          m x 1 vector of arrow angles in radians or
%          m x 3 matrix of RGB colors for markers (optional).
%   LSIZE  m x 1 vector of label size modifiers (optional).
%   SVG    Scalable Vector Graphics code as character string.
%   SVGBB  SVG bounding box dimensions: [x1 y1 x2 y2].
%
%   This function uses pixel matrix layout, in which the rows are
%   stacked vertically with origin on the upper-left corner. Positions
%   correspond to pairs of (row, col).
%
%   Each SVG hexagon will have a unique id of the form <row><col>, where
%   the position is written as a pair of zero-padded integers of minimum
%   of 2x4 characters. For instance, (34, 12) would have id '00340012'.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function hexmap = hexaimage(a, alim, cmap, pos, labels, lsize);



#{
disp("-------------------------------");
disp(a);
disp("-------------------------------");
disp(alim);
disp("-------------------------------");
svg = ''; svgbbox = [];
#}

if nargin < 2; alim = []; end
if nargin < 3; cmap = []; end
if nargin < 4; pos = []; end
if nargin < 5; labels = []; end
if nargin < 6; lsize = []; end

% Check value range.
if numel(alim) < 2; alim = [min(a(:)) max(a(:))]; end
if diff(alim(1:2)) < 1e-20; alim = (alim(1:2) + [-1 1]); end 

% Check colormap.
if isempty(cmap); cmap = rhodo(500); end
if size(cmap, 2) < 3
  error('Colormap must have at least three columns.');
end

#{
disp("---------------");
disp(cmap);
disp("---------------");
#}

[m, n] = size(a);

% Check if automatic labeling is needed.
if isempty(pos) & isempty(labels)
  [pos, labels] = place_labels(a, alim, 2);
end

% Check that positions are valid.
if ~isempty(pos)
  if sum((pos(:) < 1)) | sum((pos(:, 1) > m) | (pos(:, 2) > n))
    error('Invalid position(s) detected.');
  end
  if sum(0*pos(:) == 0) ~= numel(pos)
    error('Missing position(s) detected.');
  end
end

% Check marker sizes.
if isempty(lsize); lsize = ones(size(pos, 1), 1); end

% Map values to colors.
ncolors = size(cmap, 1);
a = (a - alim(1))./(alim(2) - alim(1) + 1e-10);
a = (floor(0.999999.*ncolors.*a) + 1);
a(find(a < 1)) = 1;
a(find(a > ncolors)) = ncolors;

#{
% Determine bounding box.
bbox = [0.5 (n + 1) 0.25 (m + 0.75)];
bbox = (bbox + 0.5*[-1 1 -1 1]);
#}

% Collect hexagons.
k = 1;
hexas = zeros(m*n, 3);
for i = 1:m
  for j = 1:n
    #{
    disp("-------------------------------");
    disp([i j]);
    disp(a(i,j));
    disp([a(i, j) i j]);
    disp(hexas);
    disp("-------------------------------");
    #}
    hexas(k, :) = [a(i, j) i j];
    k = (k + 1);
  end
end

% Convert element positions to canvas coordinates.
xy = fliplr(hexas(:, 2:3)); % pixel layout: grab yx and flip to form xy rows
even = find(mod(xy(:, 2), 2) == 0); % indices where x is even

% MOD!!!
%xy(even, 1) = (xy(even, 1) + 0.5); % increment even Xs by 0.5
%xy(:, 2) = sqrt(0.75).*xy(:, 2); % calculate Y values 

hexas(:, 2:3) = xy; % replace xy coordinates  with the xy calculations 

% Draw hexagons.
hexmap = {};
hexmap.cells = draw_hexa(hexas, cmap, 20/sqrt(m*n));
hexmap.size = struct('m', m, 'n', n);
hexmap.labels = {};


#{
disp("------------------");
disp(hexmap);
disp("------------------");
#}


if numel(pos) < 1; return; end
#{
if sum(0*a(:) == 0) > 0
  svg = [sprintf('\n<g>') svg sprintf('</g>\n')];
end
#}

% Count label conflicts.
h = zeros(size(a));
ranks = 0*pos(:, 1);
for i = 1:size(pos, 1)
  ip = pos(i, 1); jp = pos(i, 2);
  h(ip, jp) = (h(ip, jp) + 1);
  ranks(i) = h(ip, jp); 
end

% Draw labels and markers.
%svg = [svg sprintf('\n<g>')];
for i = 1:size(pos, 1)
  ip = pos(i, 1); jp = pos(i, 2);
  %[dx, dy, r] = get_shifts(ranks(i), h(ip, jp));
  %x = (jp + 0.5*mod((ip - 1), 2) + dx);
  %y = (sqrt(0.75)*ip + dy);
  %r = lsize(i)*r;
  
  % Automatic color.
  cl = [0.99 0.99 0.99];
  if a(ip, jp) > 0
    if mean(cmap(a(ip, jp), :).^2) > 0.5
      cl(1:3) = 0.1;
    end
  end
  
  % Label.
  label = cl;
  if ~isempty(labels)
    if iscell(labels)
      label = labels{i};
    else
      label = labels(i, :);
    end
  end
  
  % Glyph.
  cl = round(255*cl(1:3));
  hexmap.labels(end+1) = struct(
    'x', jp, 'y', ip, 
    'color', getColorFromRGB(cl(1), cl(2), cl(3)), 
    'label', label);
  %svg = [svg draw_label(x, y, r, cl, label)];
end

#{
svg = [svg sprintf('</g>\n')];

% Add gray background.
svgbb = (svgbb + [-20 -15 20 15]);
x = svgbb([1 3 3 1]);
y = svgbb([2 2 4 4]);
svg = [svgpath(x, y, 1, 0.9*[1 1 1], 0.8*[1 1 1], 1) svg];

#}

return;

%----------------------------------------------------------------------------

function cells = draw_hexa(hexas, cmap, lwidth);

cells = {};


#{
disp("-------------------------------");
disp("hexas");
disp(hexas);
disp("-------------------------------");
svgout = '';
bbox = [NaN NaN NaN NaN];
DIAMETER = 50;
#}


% Sort according to value.
[dummy, order] = sort(hexas(:, 1));
hexas = hexas(order, :);

#{
% Hexagonal outline.
phi = linspace(0, 2*pi, 7);
dx = sin(phi(1:6))./sqrt(3);
dy = cos(phi(1:6))./sqrt(3);

disp("--------------");
disp(hexas);
disp(size(cmap));
disp(size(hexas));
disp("--------------");
#}


% Draw hexagons.
for k = 1:size(hexas, 1)
  if ~(hexas(k, 1) >= 1); continue; end

  #{
  x = DIAMETER*(hexas(k, 2) + dx);
  y = DIAMETER*(hexas(k, 3) + dy);
  #}

  #{
  disp("--------------");
  disp("x=");
  disp(x);
  disp("y=");
  disp(y);
  disp("--------------");
  #}



  % hexas(k,1) is an INDEX of a cell in the plane
  % cmap is a Mx3 matrix where row M contains the color value for 
  clF = cmap(hexas(k, 1), :); 

  red = floor(255*clF(1, 1));
  gre = floor(255*clF(1, 2));
  blu = floor(255*clF(1, 3));
  color = getColorFromRGB(red, gre, blu);
  %color = sprintf('#%02x%02x%02x', red, gre, blu);

  x = hexas(k, 2);
  y = hexas(k, 3);
  cells(end+1) = struct('x', x, 'y', y, 'color', color);

  #{
  disp("--------------");
  disp("Color:");
  disp(color);
  disp("x:");
  disp( hexas(k, 2) );
  disp("y:");
  disp( hexas(k, 3) );
  disp("--------------");
  #}





  #{

  id = sprintf('%04d%04d', hexas(k, 2), hexas(k, 3));
  %disp(svgout);
  svgout = [svgout svgpath(x, y, [], [], clF, 1, id)];
  bbox(1) = min([bbox(1) x]);
  bbox(2) = min([bbox(2) y]);
  bbox(3) = max([bbox(3) x]);
  bbox(4) = max([bbox(4) y]);

  #}

end

return;
  
%----------------------------------------------------------------------------

function svgout = draw_label(x, y, r, cl, label);
svgout = '';
DIAMETER = 50;

% Convert coordinates to pixel units.
x = DIAMETER*x; y = DIAMETER*y;
if ~(r > 0.01); return; end

% Text.
if ischar(label)
  fs = DIAMETER.*r;
  svgout = svgtext(x, (y + 0.33*fs), label, fs, cl, [], 'middle');
  return;
end

% Arrow.
if size(label, 2) < 3
  dx = DIAMETER.*[-6.2  2.0  2.0  6.2  2.0  2.0 -6.2]./7;
  dy = DIAMETER.*[ 0.5  0.8  2.1  0.0 -2.1 -0.8 -0.5]./7;
  x = (x + cos(label).*dx - sin(label).*dy);
  y = (y + sin(label).*dx + cos(label).*dy);
  svgout = svgpath(x, y, [], [], cl, 1);
  return;
end

% Colored circle.
radius = DIAMETER*r/5;
svgout = svgcircle(x, y, radius, [], [], label);

return;

%----------------------------------------------------------------------------
function colorString = getColorFromRGB(red, green, blue);
  colorString = sprintf('#%02x%02x%02x', red, green, blue);
return;


function [pos, labels] = place_labels(a, alim, pad);
pos = []; labels = {};
[m, n] = size(a);

% Sort units according to absolute value.
values = reshape(a', m*n, 1);
values = abs(ranktf(values));
[dummy, units] = sort(-values);
xp = (floor((units - 1)/n) + 1);
yp = (mod((units - 1), n) + 1);

% Add labels to vacant slots until map is occupied.
h = zeros(m, n);
for i = 1:(m*n)
  if h(xp(i), yp(i)); continue; end
  pos = [pos' [xp(i) yp(i)]']';
  xpad = xp(i) + (-pad:pad);
  ypad = yp(i) + (-pad:pad);
  xpad = min(m, max(1, xpad));
  ypad = min(n, max(1, ypad));
  h(xpad, ypad) = 1;
end

% Include only valid values.
valids = [];
for i = 1:size(pos, 1)
  if ~(0*a(pos(i, 1), pos(i, 2)) == 0); continue; end
  valids = [valids' pos(i, :)']';
end
pos = valids;

% Create label text.
labels = cell(size(pos, 1), 1);
base = log10(alim(2) - alim(1) + 1e-20);
base = round(base);
if (base < -1) | (base > 4)
  for i = 1:size(pos, 1)
    labels{i} = sprintf('%.1e', a(pos(i, 1), pos(i, 2)));
  end
  return;
end

% Trim long labels.
len = (base + 4);
if len >= 6; len = 7; end
for i = 1:size(pos, 1)
  label = sprintf('%.6f', a(pos(i, 1), pos(i, 2)));
  n = length(label);
  labels{i} = label(1:(n-len));
end

return;

%----------------------------------------------------------------------------

function [dx, dy, r] = get_shifts(rank, count);
dx = 0; dy = 0; r = 0.5;

% Special cases.
m = round(sqrt(count));
n = ceil(count./m);
switch count
case 1
  return;
case 2
  dx = (rank - 1.5); dy = 0;
case 3
  if rank == 1; dx =  0.00; dy = -0.43; end
  if rank == 2; dx = -0.48; dy =  0.43; end
  if rank == 3; dx =  0.48; dy =  0.43; end
case 4
  if rank == 1; dx = -0.50; dy = -0.50; end
  if rank == 2; dx = -0.50; dy =  0.50; end
  if rank == 3; dx =  0.50; dy =  0.50; end
  if rank == 4; dx =  0.50; dy = -0.50; end
case 5
  if rank == 2; dx = -0.57; dy = -0.57; end
  if rank == 3; dx = -0.57; dy =  0.57; end
  if rank == 4; dx =  0.57; dy =  0.57; end
  if rank == 5; dx =  0.57; dy = -0.57; end
otherwise
  u = mod((1:count), m);
  v = sort(mod((1:count), n));
  u = u./(max(u) + eps);
  v = v./(max(v) + eps);
  dx = 1.5*(u(rank) - 0.5);
  dy = 1.5*(v(rank) - 0.5);
  if m < 3; dx = 0.6*dx; end
end

% Set correct scale.
r = min(0.5, 1.5/max(m, n));
dx = (0.4 - 0.1*r)*dx;
dy = (0.4 - 0.1*r)*dy;

return;


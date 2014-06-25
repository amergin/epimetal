%SVGPATH  Create svg path object.
%   SVG = SVGPATH(X, Y, WSTROK, CSTROK, CFILL, CLFLAG, ID)
%   X      1 x N vector of x-coordinates.
%   Y      1 x N vector of y-coordinates.
%   WSTROK Stroke width (optional).
%   CSTROK 1 x 3 or 1 x 4 vector of stroke color (optional).
%   CFILL  1 x 3 or 1 x 4 vector or string of fill color (optional).
%   CLFLAG If set to true, path is closed (optional).
%   ID     Object id string (optional).
%   SVG    Scalable Vector Graphics code as character string.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function out = svgpath(x, y, wstrok, cstrok, cfill, clflag, id);
out = '';

% Check inputs.
[M, N] = size(y);
if nargin < 3; wstrok = 1; end
if nargin < 4; cstrok = [0 0 0]; end
if nargin < 5; cfill = ''; end
if nargin < 6; clflag = 0; end
if nargin < 7; id = ''; end

% Check if only missing points.
mask = find(0.*x.*y == 0);
if isempty(mask) return; end

% Divide curve into segments if NaNs exist.
index = [mask (N + 2)];
stops = [find(diff(index) > 1)];
starts = [min(index) index(stops + 1)];
stops = [index(stops) starts(end)];
for j = find(stops > starts)
  win = (starts(j):stops(j));
  segm = svgpath_exec(x(win), y(win), wstrok, cstrok, cfill, clflag, id);
  out = [out segm];
end

return;

%----------------------------------------------------------------------------

function out = svgpath_exec(x, y, wstroke, cstroke, cfill, closeflag, id);
out = '';
N = size(x, 2);
if N < 2; return; end

% Prepare coordinate vector.
index = [1 N];
dx = abs([diff(x) 0]);
dy = abs([diff(y) 0]);
index = [find((dx + dy) > eps) N];
index = unique(index);
if numel(index) < 2; return; end  
x = x(index);
y = y(index);
coord = 0*[x y];
coord(1:2:end) = x;
coord(2:2:end) = y;

% Start path.
if ~isempty(id)
  init = sprintf('\n<path id="%s" d="\nM\t%.3f\t%.3f\nL', id, x(1), y(1));
else
  init = sprintf('\n<path d="\nM\t%.3f\t%.3f\nL', x(1), y(1));
end

% Coordinates.
conf = '';
body = sprintf('\t%.3f\t%.3f\n', coord(3:end));
if closeflag
  conf = sprintf('Z"\nstyle="\n');
else
  conf = sprintf('"\nstyle="\n');
end

% Stroke color.
if ~isempty(cstroke)
  red = floor(255*cstroke(1));
  gre = floor(255*cstroke(2));
  blu = floor(255*cstroke(3));
  if numel(cstroke) > 3
    conf = sprintf('%sstroke-opacity:%.2f;\n', conf, cstroke(4));
  end
  conf = sprintf('%sstroke-linecap:round;\n', conf);
  conf = sprintf('%sstroke-linejoin:round;\n', conf);
  conf = sprintf('%sstroke:#%02x%02x%02x;\n', conf, red, gre, blu);
else
  conf = sprintf('%sstroke:none;\n', conf);
end

% Stroke width.
if ~isempty(wstroke)
  conf = sprintf('%sstroke-width:%f;\n', conf, wstroke);
end

% Fill color.
if ~isempty(cfill)
  if ischar(cfill)
    conf = sprintf('%sfill:%s;\n', conf, cfill);
  else
    red = floor(255*cfill(1, 1));
    gre = floor(255*cfill(1, 2));
    blu = floor(255*cfill(1, 3));
    conf = sprintf('%sfill:#%02x%02x%02x;\n', conf, red, gre, blu);
    if numel(cfill) > 3
      conf = sprintf('%sfill-opacity:%.2f;\n', conf, cfill(4));
    end
  end
else
  conf = sprintf('%sfill:none;\n', conf);
end

% Finish output.
conf = sprintf('%s"/>\n', conf);
out = [init body conf];

return;

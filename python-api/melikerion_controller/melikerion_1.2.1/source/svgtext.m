%SVGTEXT  Create svg text object.
%   SVG = SVGTEXT(X, Y, STR, FS, CL, ANGLE, ANCH, ID)
%   X      X-coordinate.
%   Y      Y-coordinates.
%   STR    Text string.
%   FS     Font size in pixels.
%   CL     1 x 3 or 1 x 4 vector of font RGB color.
%   ANGLE  Rotation angle in degrees.
%   ANCH   Text anchor: 'start', 'middle' or 'end'.
%   ID     Object id string (optional).
%   SVG    Scalable Vector Graphics code as character string.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octve/Matlab compatible.

function out = svgtext(x, y, str, fs, cl, angle, anch, id);
disp("---------------------------");
disp("SVGTEXT");
disp([x y]);
disp(str);
disp("---------------------------");
out = '';

% Check inputs.
x = x(1); y = y(1);
if ~(0*x.*y == 0); return; end
if ~ischar(str); return; end
if nargin < 4; fs = []; end
if nargin < 5; cl = []; end
if nargin < 6; angle = []; end
if nargin < 7; anch = ''; end
if nargin < 8; id = []; end
if isempty(fs); fs = 16; end
if isempty(cl); cl = [0 0 0]; end

% Start tag.
out = sprintf('\n<text x="%.3f" y="%.3f" ', x, y);
if ~isempty(id) & ischar(id)
  out = [out sprintf('id="%s"', id)];
end

% Rotation.
if ~isempty(angle)
  out = [out sprintf('\ntransform="')];
  out = [out sprintf('rotate(%.2f, %.2f, %.2f)"', angle(1), x, y)];
end

% Font size and color.
fs = max(1, fs);
rgb = round(255*cl(1:3));
rgb(find(rgb < 0)) = 0; rgb(find(rgb > 255)) = 255;
out = [out sprintf('\nstyle="font-size: %.2fpx;', fs(1))];
out = [out sprintf('\nfont-family: FreeSans;')];
out = [out sprintf('\nfill: #%02x%02x%02x;', rgb(1), rgb(2), rgb(3))];
if numel(cl) > 3
  out = [out sprintf('\nfill-opacity: %.2f;', cl(4))];
end
out = [out '"'];

% Text anchor.
if ~isempty(anch) & ischar(anch)
  out = [out sprintf('\ntext-anchor="%s"', anch)];
end
  
% Text body.
out = [out sprintf('>\n')];
out = [out str];
out = [out sprintf('\n</text>\n')];

return;

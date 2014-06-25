%SVGPRINT  Wrap SVG objects to a file.
%   SVGPRINT(FNAME, SVG, BBOX, SCALE)
%   FNAME  Output file name.
%   SVG    String that contains the code.
%   BBOX   SVG bounding box dimensions: [x1 y1 x2 y2] (optional).
%   SCALE  Change coordinate scale (optional).
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function svgprint(fname, svg, bbox, scale);

#{
disp("---------------------------");
disp("fname");
disp(fname);
disp("---------------------------");
disp("svg");
disp(svg);
%disp("---------------------------");
disp("bbox");
disp(bbox);
%disp("---------------------------");
disp("scale");
%disp(scale);
%disp("---------------------------");
%disp("---------------------------");
%disp("---------------------------");
#}

if nargin < 3; bbox = []; end
if nargin < 4; scale = []; end

% Vector graphics wrapper.
fid = fopen(fname, 'wt');
fprintf(fid, '%s\n', svg_init(bbox, scale));
fprintf(fid, '%s\n', svg);
fprintf(fid, '%s\n', svg_eof);
fclose(fid);
fprintf(1, 'Vector graphics saved to "%s".\n', fname);

return;

%-----------------------------------------------------------------------------

function t = svg_init(bb, scale);
if isempty(scale); scale = 1; end

% Start document.
t = sprintf('<?xml version="1.0"?>\n');
t = [t sprintf('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"\n')];
t = [t sprintf('"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n')];
t = [t sprintf('<svg xmlns="http://www.w3.org/2000/svg"')];

% Set canvas dimensions.
if ~isempty(bb)
  t = [t sprintf(' x="0" y="0"')];
  t = [t sprintf(' width="%.0f"', scale*(bb(3) - bb(1)))];
  t = [t sprintf(' height="%.0f"', scale*(bb(4) - bb(2)))];
end
t = [t sprintf('>\n')];

% Coordinate translation.
tform = '';
if ~isempty(bb)
  if (bb(1) ~= 0) | (bb(2) ~= 0)
    if length(tform) > 0; tform = [tform ' ']; end
    tform = sprintf('translate(%f,%f)', -scale*bb(1), -scale*bb(2));
  end
end

% Coordinate scale.
if scale ~= 1
  if length(tform) > 0; tform = [tform ' ']; end
  tform = [tform sprintf('scale(%f,%f)', scale, scale)];
end

% Umbrella group.
t = [t sprintf('<g id="svgprint"')];
if length(tform) > 0
  t = [t sprintf(' transform="%s"', tform)];
end
t = [t sprintf('>\n')];

return;

%-----------------------------------------------------------------------------

function t = svg_eof;
t = sprintf('</g>\n</svg>\n');
return;

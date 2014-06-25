%SVGCIRCLE  Create svg circle objects.
%   SVG = SVGCIRCLE(X, Y, R, WSTROK, CSTROK, CFILL)
%   X      1 x N vector of x-coordinates.
%   Y      1 x N vector of y-coordinates.
%   R      1 x N vector or radii (optional).
%   WSTROK 1 x 1 or N x 1 vector of stroke widths (optional).
%   CSTROK 1 x 3 or N x 3 matrix of stroke color (optional).
%   CFILL  1 x 3 or N x 3 vector or string of fill color (optional).
%   SVG    Scalable Vector Graphics code as character string.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function out = svgcircle(x, y, r, wstrok, cstrok, cfill);
out = '';
if nargin < 3; r = []; end
if nargin < 4; wstrok = []; end
if nargin < 5; cstrok = []; end
if nargin < 6; cfill = ''; end

% Check inputs.
if isempty(r); r = 4*ones(1, size(x, 2)); end
if (size(x, 2) ~= size(y, 2)) | (numel(x) ~= numel(y))
  error('X and Y have different sizes.');  
end
if size(x, 1) ~= 1
  error('X must have one row.');
end
if ~isempty(wstrok) & (size(wstrok, 2) ~= 1)
  wstrok
  error('WSTROK must have one column.');
end
if ~isempty(cstrok) & (size(cstrok, 2) ~= 3)
  error('CSTROK must have three columns.');
end
if ~isempty(cfill) & (size(cfill, 2) ~= 3)
  error('CFILL must have three columns.');
end

% Replicate strokes and colors.
if ~isempty(wstrok) & (size(wstrok, 1) < size(x, 2))
  wstrok = repmat(wstrok(1), size(x, 2), 1);
end
if ~isempty(cstrok) & (size(cstrok, 1) < size(x, 2))
  cstrok = repmat(cstrok(1, :), size(x, 2), 1);
end
if ~isempty(cfill) & (size(cfill, 1) < size(x, 2))
  cfill = repmat(cfill(1, :), size(x, 2), 1);
end

% Draw circles.
for i = find(0.*x.*y.*r == 0)
  if r(i) < 0.001; continue; end
  
  % Start tag.
  out = [out sprintf('\n<circle cx="%.2f" cy="%.2f" ', x(i), y(i))];
  out = [out sprintf('r="%.3f"\nstyle="\n', r(i))];
  
  % Stroke width.
  conf = '';
  if ~isempty(wstrok)
    conf = sprintf('stroke-width:%f;\n', wstrok(i));
  end
  out = [out conf];
  
  % Stroke color.
  if ~isempty(cstrok)
    red = floor(255*cstrok(i, 1));
    gre = floor(255*cstrok(i, 2));
    blu = floor(255*cstrok(i, 3));
    if red*gre*blu >= 0
      conf = sprintf('stroke:#%02x%02x%02x;\n', red, gre, blu);
    else
      conf = sprintf('stroke:none;\n');
    end
  else
    conf = sprintf('stroke:none;\n');
  end
  out = [out conf];
  
  % Fill color.
  if ~isempty(cfill)
    if ischar(cfill)
      conf = sprintf('fill:%s;\n', cfill);
    else
      red = floor(255*cfill(i, 1));
      gre = floor(255*cfill(i, 2));
      blu = floor(255*cfill(i, 3));
      if red*gre*blu >= 0
        conf = sprintf('fill:#%02x%02x%02x;\n', red, gre, blu);
      else
        conf = sprintf('fill:none;\n');      
      end
    end
  else
    conf = sprintf('fill:none;\n');
  end
  out = [out conf];
  
  % End tag.
  out = [out sprintf('"/>\n')];
end

return;

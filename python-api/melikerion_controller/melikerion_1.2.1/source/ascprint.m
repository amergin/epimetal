%ASCPRINT  Save matrix data to ascii text file.
%   ASCPRINT(FNAME, X, HEADER, MODE)
%   FNAME  Output file name, use '' for screen output.
%   X      M x N data matrix.
%   HEADER 1 x N cell array of column headings (optional).
%   MODE   If true, X will be printed transposed with
%          the header in the first column (optional).
%
%   The first column (or row in transposed mode) is printed using
%   eight decimal places. The rest of the fields are printed in
%   exponential (i.e. 123.123e-123) format with 16 digits.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function ascprint(fname, x, header, mode);
if nargin < 3; header = {}; end
if nargin < 4; mode = []; end
if isempty(mode); mode = 0; end
if isempty(x); return; end

% Check inputs.
[m, n] = size(x);
if (n ~= size(header, 2)) & ~isempty(header)
  error('Wrong number of headings.');
end

% Open file.
fid = 1;
if ~isempty(fname)
  fid = fopen(fname, 'wt');
  if fid < 0; error('File is not writable.'); end
end

% Write to file.
if ~mode
  m = ascprint_row(fid, x, header);
else
  m = ascprint_column(fid, x, header);
end

% Show report.
if fid ~= 1
  fclose(fid);
  %fprintf(1, 'Wrote %d lines to "%s".\n', m, fname);
end

return;

%-----------------------------------------------------------------------------

function m = ascprint_row(fid, x, header);
[m, n] = size(x);
st = [];

% Print header.
if ~isempty(header)
  fprintf(fid, '%s', header{1});
  for j = 2:n
    fprintf(fid, '\t%s', header{j});
  end
  fprintf(fid, '\n');
end

% Print data.
for i = 1:m
  if round(x(i, 1)) ~= x(i, 1)
    fprintf(fid, '%.8f', x(i, 1));
  else
    fprintf(fid, '%d', x(i, 1));
  end
  for j = 2:n
    if round(x(i, j)) ~= x(i, j)
      fprintf(fid, '\t%.16e', x(i, j));
    else
      fprintf(fid, '\t%d', x(i, j));
    end
  end
  fprintf(fid, '\n');
  st = progmonit('ascprint:row', i/m, 5, st);
end
if ~isempty(header)
  m = (m + 1);
end

return;

%-----------------------------------------------------------------------------

function n = ascprint_column(fid, x, header);
[m, n] = size(x);
hflag = ~isempty(header);
st = [];

% First row.
if hflag; fprintf(fid, '%s\t', header{1}); end
for i = 1:m
  if i > 1; fprintf(fid, '\t'); end
  if round(x(i, 1)) ~= x(i, 1)
    fprintf(fid, '%.8f', x(i, 1));
  else
    fprintf(fid, '%d', x(i, 1));
  end
end
fprintf(fid, '\n');

% Ordinary rows.
for j = 2:n
  if hflag; fprintf(fid, '%s\t', header{j}); end
  for i = 1:m
    if i > 1; fprintf(fid, '\t'); end
    if round(x(i, j)) ~= x(i, j)
      fprintf(fid, '%.16e', x(i, j));
    else
      fprintf(fid, '%d', x(i, j));
    end
  end
  fprintf(fid, '\n');
  st = progmonit('ascprint:column', j/n, 5, st);
end

return;

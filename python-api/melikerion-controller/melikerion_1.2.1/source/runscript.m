%RUNSCRIPT  Run an m-script with the given name.
%   RUNSCRIPT(FNAME)
%   FNAME  File name.
%
%   The script cannot handle commands that don't end with ';' so
%   especially Matlab users are advised to use run() instead.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function runscript(fname);

% Read entire data at once.
fid = fopen(fname, 'rt');
if fid < 0
  error(['Could not open file "' fname '".']);
end
d = fread(fid, Inf);  
fclose(fid);

% Replace the annoying '\r' from DOS related files.
nc = char(10);  % ASCII \n
rc = char(13);  % ASCII \r
d = char(d);
d(find(d == rc)) = nc;
d = [reshape(d, 1, numel(d)) nc];

% Parse lines.
start = 1;
lines = {};
for i = 2:numel(d)
  if d(i) == nc
    if start < (i - 1)
      n = numel(lines);
      lines{n+1} = char(d(start:(i-1)));
    end
    start = (i + 1);
  end
end

% Remove comments and collect commands to a single line.
commands = '';
for i = 1:numel(lines)
  pos = min(find(lines{i} == '%'));
  if isempty(pos); pos = numel(lines{i});
  else pos = (pos - 1); end
  if pos < 1; continue; end
  commands = [commands ' ' lines{i}(1:pos)];
end

% Add script directory to commands.
slash = '/';
if ~isdir('/'); slash = '\\'; end
slash = slash(1);
pos = max(find(fname == slash));
if ~isempty(pos) & (pos < numel(fname));
  ac = char(39); % ASCII '
  commands = ['cd(' ac fname(1:pos) ac '); ' commands];
end

% Execute command.
currdir = pwd;
try
  evalin('caller', commands);
catch
  warning(['Could not run the script "' fname '".']);
end
cd(currdir);

return;

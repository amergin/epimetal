%MELIKERION  Worker function for the online version of MeliKerion.
%   MELIKERION(WDIR, LOGFN, DATFN, PARFN)
%   WDIR   Working directory.
%   LOGFN  Log file.
%   DATFN  Data import script.
%   PARFN  Parameter import script (optional).
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function melikerion(wdir, logfn, datfn, parfn);
update_log(logfn, '* MeliKerion v1.2.1 starting...');
if nargin < 4; parfn = ''; end

% Import data.
runscript(datfn);
[xhdr, xvars] = cellisect(header, inputs);
[yhdr, yvars] = cellisect(header, responses);
[thdr, tvars] = cellisect(header, tests);
x = data(:, xvars);
y = data(:, yvars);
t = data(:, tvars);

% Check model parameters.
if ~isempty(parfn); runscript(parfn); end
if ~exist('MapSize', 'var'); MapSize = []; end
if ~exist('SimulationLimit', 'var'); SimulationLimit = 500; end
  
% Convert nominal variables to binary.
[x, xhdr] = binarize(x, xhdr, 8);
[y, yhdr] = binarize(y, yhdr, 8);
[t, thdr] = binarize(t, thdr, 8);

% Truncate long variable names.
[xhdr, xtags] = check_hdr(xhdr);
[yhdr, ytags] = check_hdr(yhdr);
[thdr, ttags] = check_hdr(thdr);

% Prepare training data.
z = ranktf(x); z = (z + z.^3)/2;
q = ranktf(y); q = (q + q.^3)/2;

% Create self-organizing map.
update_log(logfn, '* Training self-organizing map...');
sm = somcreate(z, xtags, MapSize);
[sm, bmus] = somtrain(sm, z, q);
somvisproto(sm, [], [], wdir);
somvisquality(sm, z, labels, wdir);

% Impute missing values.
update_log(logfn, '* Saving imputed datasets...');
smI = somcreate(x, xhdr, sm.msize, sm.rho, bmus);
[dum1, dum2, xi, eta] = somtrain(smI, x, y, 0);
[dum1, dum2, dum3, yps] = somtrain(smI, x, t, 0);
save_matrix([check_path(wdir) 'imputed_inputs.txt'], xi, xhdr, labels);
save_matrix([check_path(wdir) 'estimated_responses.txt'], eta, yhdr, labels);
save_matrix([check_path(wdir) 'estimated_testvars.txt'], yps, thdr, labels);

% Compute colorings for input variables.
update_log(logfn, ['* Estimating dynamic range for "' xtags{1} '"...']);
xstats = somtest(sm, bmus, x(:, 1), 0);
for j = 2:size(x, 2)
  update_log(logfn, ['* Estimating dynamic range for "' xtags{j} '"...']);
  xstats(j) = somtest(sm, bmus, x(:, j), 0);
end

% Compute colorings for response variables.
if size(y, 2) > 0 
  update_log(logfn, ['* Estimating dynamic range for "' ytags{1} '"...']);
  ystats = somtest(sm, bmus, y(:, 1), 0);
  for j = 2:size(y, 2)
    update_log(logfn, ['* Estimating dynamic range for "' ytags{j} '"...']);
    ystats(j) = somtest(sm, bmus, y(:, j), 0);
  end
end

% Compute colorings for test variables.
if size(t, 2) > 0 
  update_log(logfn, ['* Estimating statistics for "' ttags{1} '"...']);
  tstats = somtest(sm, bmus, t(:, 1), SimulationLimit);
  for j = 2:size(t, 2)
    update_log(logfn, ['* Estimating statistics for "' ttags{j} '"...']);
    tstats(j) = somtest(sm, bmus, t(:, j), SimulationLimit);
  end
end

% Store results.
update_log(logfn, '* Visualizing planes...');
values = x; names = xhdr; stats = xstats;
if size(y, 2) > 0
  values = [values y];
  names = {names{:}, yhdr{:}};
  stats = [stats ystats];
end
if size(t, 2) > 0
  values = [values t];
  names = {names{:}, thdr{:}};
  stats = [stats tstats];
end
somvisplane(sm, bmus, values, names, stats, wdir);
save_bmus(bmus, labels, wdir);

return;

%-----------------------------------------------------------------------------

function save_bmus(bmus, labels, wdir);
fname = [check_path(wdir) 'bmus.txt'];
fid = fopen(fname, 'wt');
if fid < 1
  error(['Cannot open "' fname '".']);
end
fprintf(fid, 'ID\tROW\tCOL\n');
for i = 1:size(bmus, 1)
  fprintf(fid, '%s\t%.0f\t%.0f\n', labels{i}, bmus(i, 1), bmus(i, 2));
end
fclose(fid);
fprintf(1, 'BMUs saved to "%s".\n', fname);
return;

%-----------------------------------------------------------------------------

function save_matrix(fname, x, xhdr, labels);
if isempty(x); return; end

fid = fopen(fname, 'wt');
if fid < 1
  error(['Cannot open "' fname '".']);
end

fprintf(fid, 'ID');
for j = 1:numel(xhdr)
  fprintf(fid, '\t%s', xhdr{j});
end
fprintf(fid, '\n');

for i = 1:size(x, 1)
  fprintf(fid, '%s', labels{i});
  for j = 1:size(x, 2)
    fprintf(fid, '\t%.16e', x(i, j));
  end
  fprintf(fid, '\n');
end

fclose(fid);
fprintf(1, 'Matrix saved to "%s".\n', fname);

return;

%-----------------------------------------------------------------------------

function [hdr, tags] = check_hdr(hdr);

% Make sure headings are alphanumeric.
for j = 1:numel(hdr)
  asc = hdr{j};
  is_a = ((asc >= 'a') & (asc <= 'z'));
  is_A = ((asc >= 'A') & (asc <= 'Z'));
  is_0 = ((asc >= '0') & (asc <= '9'));
  ok = (is_a | is_A | is_0);
  asc(find(~ok)) = '_';
  hdr{j} = asc;
end

% Check that headings are unique.
if numel(unique(hdr)) ~= numel(hdr)
  msg = 'Unique variable names could not be used. Please ';
  msg = [msg 'check your data file and the column headings therein. '];
  msg = [msg 'Check also that you are using only the basic '];
  msg = [msg 'alphabet (a-z or A-Z) and numbers (0-9).'];
  error(msg);
end

% Truncate long headings.
tags = cell(size(hdr));
for j = 1:numel(hdr)
  asc = hdr{j};
  if length(asc) > 14
    asc(13) = '.'; asc(14) = '.';
    asc = asc(1:14);
  end
  tags{j} = asc;
end

return;

%-----------------------------------------------------------------------------

function update_log(logfn, msg);
fid = fopen(logfn, 'at');
if fid < 1
  error(['Cannot open "' logfn '".']);
end
fprintf(fid, '%s\t%s\n', datestr(now, 'HH:MM:SS'), msg);
fclose(fid);
return;

%-----------------------------------------------------------------------------

function wpath = check_path(wdir);

slash = '/';
if ~isdir('/'); slash = '\\'; end
while (length(wdir) > 1) & (wdir(end) == slash(1))
  wdir = wdir(1:(end-1));
end
wpath = [wdir slash(1)];
if ~isdir(wpath); mkdir(wpath); end
if ~isdir(wpath)
  error(sprintf('Cannot not open "%s".', wpath));
end

return;

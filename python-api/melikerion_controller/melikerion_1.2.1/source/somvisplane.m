%SOMVISPLANE  Visualize map demographics.
%   SOMVISPLANE(SM, BMUS, Y, HDR, STATS, RDIR)
%   SM    SOM structure as prepared by 'somtrain'.
%   Y     M x N data matrix.
%   HDR   1 x N cell array of variable names (optional).
%   STATS 1 x N struct array of outputs from 'somtest' (optional).
%   RDIR  Results directory (optional).
%
%   The Y must be compatible with the SOM training data.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function somvisplane(sm, bmus, y, hdr, stats, rdir);
if nargin < 4; hdr = {}; end
if nargin < 5; stats = []; end
if nargin < 6; rdir = ''; end
if isempty(rdir); rdir = '.'; end
if ~isfield(sm, 'codebook'); return; end

% Check results directory.
slash = '/';
if ~isdir('/'); slash = '\\'; end
while (length(rdir) > 1) & (rdir(end) == slash(1))
  rdir = rdir(1:(end-1));
end
rpath = [rdir slash(1)];
if ~isdir(rpath); mkdir(rpath); end
if ~isdir(rpath)
  error(sprintf('Could not open "%s".', rpath));
end

% Check header.
if isempty(hdr)
  hdr = cell(1, size(y, 2));
  for j = 1:size(y, 2)
    hdr{j} = sprintf('Var%04d', j);
  end 
end
if ~iscell(hdr); hdr = {hdr}; end

% Compute significange estimates.
if isempty(stats); stats = somtest(sm, bmus, y); end
g = [stats.g];
ind = find(0*g == 0);
if isempty(ind); return; end

% Determine color range coefficient.
rfactor = get_range(sm, bmus, y, stats);

% Visualize planes.
msg = '';
for j = ind
  s = paint_plane(sm, bmus, y(:, j), hdr{j}, stats(j), rpath, rfactor);
  msg = [msg s];
end

% Create summary file.
if ~isempty(msg)
  fname = sprintf('%spvalues.txt', rpath);
  if ~exist(fname, 'file')
    msg = [sprintf('NAME\tN\tP\tG\tNSIM\n') msg];
  end
  fid = fopen(fname, 'at'); fprintf(fid, '%s', msg); fclose(fid);
  fprintf(1, 'Summary appended to "%s".\n', fname);
end

return;

%----------------------------------------------------------------------------

function rfactor = get_range(sm, bmus, y, stats);
r = [];
for j = 1:size(y, 2)
  if isempty(stats(j).ynull); continue; end
  a = hexavalue(bmus, sm.msize, y(:, j), sm.rho);
  rj = [min(a(:)) max(a(:))];
  r = [r diff(rj)./diff(stats(j).ynull)];
end
r = sort(r(:));
ind = ceil(0.999*numel(r));
rfactor = max(r(ind), 3);
return;

%----------------------------------------------------------------------------

function msg = paint_plane(sm, bmus, yj, name, statj, rpath, rfactor);
msg = '';
fbase = sprintf('%s%s_', rpath, name);

% Simulation histogram.
if statj.p >= 0
  [svgout, bb] = plot_null(statj.p, statj.g, statj.gnull);
  svgprint([fbase 'null.svg'], svgout, bb);
  msg = sprintf('%s%s\t%d', msg, name, numel(yj));
  msg = sprintf('%s\t%.3e\t%.2f\t', msg, statj.p, statj.g);
  msg = sprintf('%s%d\n', msg, numel(statj.gnull));
end

% Draw plane.
rg = statj.ynull;
lim = rfactor*(rg - mean(rg));
lim = (mean(rg) + lim);
a = hexavalue(bmus, sm.msize, yj, sm.rho);
[svgout, bb] = hexaimage(a, lim);

% Save figure.
width = sqrt((bb(3) - bb(1))*(bb(4) - bb(2)));
svgprint([fbase 'plane.svg'], svgout, bb, 500/max(500, width));

% Save plane and confidence intervals.
alpha = round(500*(1 - statj.clev));
save_matrix([fbase 'plane.txt'], a);
if alpha > 0
  save_matrix([fbase sprintf('c%04d.txt', alpha)], statj.clow);
  save_matrix([fbase sprintf('c%04d.txt', (1000 - alpha))], statj.chigh);
end

return;

%---------------------------------------------------------------------------

function [svg, bb] = plot_null(p, g, hg);
svg = ''; bb = [NaN NaN NaN NaN];
if ~(std(hg) > 0); return; end

% Estimate histogram.
range = max(hg);
[h1, hx1] = hist(hg, (linspace(-range, range, 20) - range/20));
[h2, hx2] = hist(hg, linspace(-range, range, 20));
[h3, hx3] = hist(hg, (linspace(-range, range, 20) + range/20));
hx = (hx1 + hx2 + hx3)/3;
h = (h1 + h2 + h3)/3;

% Make room for the observed statistic with a dummy bar.
toler = 1.1*max(diff(hx));
if (g + toler) > max(hx)
  hx = [hx (max([hx g]) + toler)];
  h = [h NaN];
end
if (g - toler) < min(hx)
  hx = [hx (min([hx g]) - toler)];
  h = [h NaN];
end

% Draw bars.
[svg, bb, u, v] = svgbar(hx, h);
bb(4) = bb(4)/2; % only non-negative heigts
svg = [sprintf('\n<g id="bars">\n') svg sprintf('</g>\n')];

% Determine transformation from HX to U.
scale = (max(u) - min(u) + 1e-20)/(max(hx) - min(hx) + 1e-20);
shift = (u(1)/scale - hx(1));

% Set density scale.
[top, index] = sort(v);
vtop = mean(max(v) - v(index(1:3)));
ttop = mean(pdfgauss(u(index(1:3)), scale*shift, scale));
z = vtop./(ttop + 1e-20);

% Compute density curve.
n = numel(u);
s = interp1((1:n), u, linspace(1, n, 2000), 'linear');
s = unique([(bb(1) - 50):bb(1) s bb(3):(bb(3) + 50)]);
t = z.*pdfgauss(s, scale*shift, scale);
t = (bb(4) - t);
[s, t] = simplify(s, t, 200);

% Draw density curve.
svg = [svg svgpath(s, t, 1.5, [0 0.25 1])];

% Draw observation.
s0 = scale*(g + shift);
t0 = (bb(4) - z.*pdfgauss(s0, scale*shift, scale));
svg = [svg svgpath([s0 s0], [t0 (t0 - 25)], 2, [0.95 0.25 0], [], 0)];
svg = [svg svgcircle(s0, t0, 4, [], [], [0.95 0.25 0])];

% Write the value of G.
s = s0;
t = (t0 - 35);
anch = 'middle';
if (g > 0) & (sum(g <= hx) > 1); anch = 'start'; s = (s - 3); end
if (g < 0) & (sum(g > hx) > 1); anch = 'end'; s = (s + 3); end
label = sprintf('g = %.2f', g);
svg = [svg svgtext(s, t, label, 16, [0.95 0.25 0], [], anch)];

% Add white background.
bb = (bb + [-57 -60 57 20]);
x = bb([1 3 3 1]);
y = bb([2 2 4 4]);
svg = [svgpath(x, y, [], [], 0.99*[1 1 1], 1) svg];

% Write P-value and number of simulations.
if p < eps
  label = sprintf('p &lt; %.2e', eps);
else
  label = sprintf('p = %.2e', p);
end
svg = [svg svgtext((bb(1) + 7), (bb(2) + 23), label, 16, [])];
label = sprintf('%d simulations', numel(hg));
svg = [svg svgtext((bb(3) - 7), (bb(2) + 23), label, 16, [], [], 'end')];
  
return;

%-----------------------------------------------------------------------------

function save_matrix(fname, a);
[m, n] = size(a);
fid = fopen(fname, 'wt');
for j = 1:n
  fprintf(fid, '\tColumn%d', j);
end
for i = 1:m
  fprintf(fid, '\nRow%d', i);
  for j = 1:n
    fprintf(fid, '\t%g', a(i, j));
  end
end
fprintf(fid, '\n');
fclose(fid);
fprintf(1, 'Matrix saved to "%s".\n', fname);
return;

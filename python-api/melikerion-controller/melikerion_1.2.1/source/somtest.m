%SOMTEST  Estimate statistical significance of SOM coloring.
%   STATS = SOMTEST(SM, BMUS, Y, NSIM, CLEV)
%   SM     SOM structure from 'somtrain'.
%   BMUS   M x 2 matrix of unit coordinates from 'somtrain'.
%   Y      M x K matrix of sample values.
%   NSIM   Number of simulation and bootstrapping rounds (optional).
%   CLEV   Confidence level, default is 0.95 (optional).
%   STATS  1 x K structure array:
%          p      Empirical P-value.
%          g      Observed statistic.
%          gnull  1 x n vector of simulated statistics. 
%          ynull  1 x 2 vector of estimated dynamic range for null planes.   
%          clow   m x n matrix of lower conficence limits.
%          chigh  m x n matrix of higher conficence limits.
%          clev   See CLEV.
%
%   This function uses pixel matrix layout, in which positions correspond
%   to pairs of (row, col) in the som plane. It uses an algorithm that does
%   not take into account neighbor distances in the data space.
%   Missing BMUs are ignored.
%
%   For those variables that were also used as training data for the SOM,
%   set NSIM to zero; only the dynamic range 'ynull' is estimated and
%   subsequent calls to visualizing functions will recognize the variable
%   as an input.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function stats = somtest(sm, bmus, y, nsim, clev);
if nargin < 4; nsim = []; end
if nargin < 5; clev = []; end
if isempty(nsim); nsim = 500; end
if isempty(clev); clev = 0.95; end
clev = max(1e-6, min(1, clev(1)));
if size(y, 1) ~= size(bmus, 1)
  error('BMUS and Y must have the same number of rows.');
end

% Check if Y is an input.
numsim = max(nsim, 5);
numsim = numsim([1 1]);
if(nsim < 1) numsim = [100 0]; end

% Simulate null distributions.
args.j = 1;
args.nvars = size(y, 2);
args.numsim = numsim;
args.clev = clev;
args.st = [];
[stats, args] = somtest_simu(sm, bmus, y(:, 1), args);
for j = 2:size(y, 2)
  args.j = j;
  [statj, args] = somtest_simu(sm, bmus, y(:, j), args);
  stats(j) = statj;
end
progmonit('somtest', 1, 5, args.st);

return;

%----------------------------------------------------------------------------

function [stat, args] = somtest_simu(sm, bmus, y, args);
stat.p = NaN;
stat.g = [];
stat.gnull = [];
stat.ynull = [];
stat.clow = NaN*ones(sm.msize);
stat.chigh = NaN*ones(sm.msize);
stat.clev = NaN;
numsim = args.numsim;
ntotsim = sum(numsim);
clev = args.clev;

% Remove missing values.
y = y(:, 1);
mask = find(0*y == 0);
y = y(mask);
bmus = bmus(mask, :);

% Check if no real variation.
M = size(y, 1);
if M < 3; return; end
if std(y) < eps; return; end

% Check for missing BMUs.
if sum(bmus(:) > 0) ~= numel(bmus);
  error('Invalid BMUs detected.');
end

% Convert bmus to unit indices.
pos = (bmus - 1);
m = sm.msize(1); n = sm.msize(2);
indices = round(pos(:, 1)*n + mod(pos(:, 2), n) + 1);

% Find units with no hits and set the neighbor weights to zero.
neighbors = sm.neighs;
links = sm.links;
zerounits = setdiff((1:(m*n))', unique(indices));
for i = 1:numel(zerounits)
  mask = find(neighbors == zerounits(i));
  links(mask) = 0;
end

% Trim neighbor and weight matrices.
cols = find(mean(links) > 0);
neighbors = neighbors(:, cols);
links = links(:, cols);

% Replace empty neighbors with ones for convenience.
missing = find(~(neighbors > 0));
neighbors(missing) = 1;

% Observed statistic.
[a, g] = value_smooth(y, indices, neighbors, links);

% Null hypothesis.
hg = []; rg = [];
for i = 1:numsim(1)
  [dummy, mask] = sort(rand(M, 1));
  [ai, gi, ri] = value_smooth(y(mask), indices, neighbors, links);
  hg = [hg gi];
  rg = [rg ri'];
  progr = ((args.j - 1)*ntotsim + i);
  progr = progr/(args.nvars)/ntotsim;
  args.st = progmonit('somtest', progr, 5, args.st);
end
rg = median(rg');

% Adjust statistic scale.
mask = find(hg > min(hg));
scale = 2./max([std(hg(mask)) eps]);
g = log(max([scale.*g eps]));
hg = log(max(scale.*hg, eps));
gmed = median(hg);
gsigma = std(hg(mask));
g = (g - gmed)./max([gsigma eps]);
hg = (hg - gmed)./max([gsigma eps]);

% No statistical significance estimates for SOM inputs.
if numsim(2) < 1
  stat.g = g;
  stat.gnull = hg;
  stat.ynull = rg;
  return;
end

% Estimate p-value.
p = cdfgauss(-g, 0, 1);

% Bootstrapping.
m = sm.msize(1); n = sm.msize(2);
v = NaN*ones(numsim(2), m*n);
for i = 1:numsim(2)
  mask = ceil(M*rand(M, 1));
  mask = max(min(mask, M), 1);
  v(i, :) = value_smooth(y(mask), indices(mask), neighbors, links)';
  progr = ((args.j - 1)*ntotsim + numsim(1) + i);
  progr = progr/(args.nvars)/ntotsim;
  args.st = progmonit('somtest', progr, 5, args.st);
end

% Determine confidence intervals.
v = sort(v);
alpha = (1 - clev)/2;
start = round(alpha*numsim(2));
stop = round((1 - alpha)*numsim(2));
start = max(start, 1);
stop = min(stop, size(v, 1));
ciA = reshape(v(start, :), n, m)';
ciB = reshape(v(stop, :), n, m)';

% Determine exact confidence level.
len = (size(v, 1) - 1 + eps);
alpha = (1 + start/len - stop/len)/2;

% Collect simulation results.
stat.p = p;
stat.g = g;
stat.gnull = hg;
stat.ynull = rg;
stat.clow = ciA;
stat.chigh = ciB;
stat.clev = (1 - 2*alpha);

return;

%-----------------------------------------------------------------------------

function [a, g, r] = value_smooth(y, indices, neighbors, links);

% Compute unit averages.
k = 1;
v = zeros(size(neighbors, 1), 1);
h = zeros(size(neighbors, 1), 1);
for i = indices'
  v(i) = (v(i) + y(k));
  h(i) = (h(i) + 1);
  k = (k + 1);
end

% Smoothen plane.
a = NaN*v; b = 0*h;
for i = 1:numel(a)
  nhood = neighbors(i, :)';
  a(i) = links(i, :)*v(nhood);
  b(i) = links(i, :)*h(nhood);
end
a = a./max(b, 1e-20);
if nargout < 2; return; end

% Estimate the level of bumpiness.
g = var(a);

% Dynamic range.
r = [min(a) max(a)];

return;

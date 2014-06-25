%SIMPLIFY  Resample 2D curves for more efficient representation.
%   [U, V] = SIMPLIFY(X, Y, NTARG)
%   X      1 x N vector of measurement points.
%   Y      M x N matrix of measurement values.
%   NTARG  Target number of points (optional).
%   U      1 x n vector of measurement points.
%   V      M x n matrix of measurement values.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function [u, v] = simplify(x, y, ntarget);
u = []; v = []; RES = 8;
if nargin < 3; ntarget = []; end

% Check inputs.
[M, N] = size(y);
if isempty(x); x = (1:N); end
if N ~= size(x, 2)
  error('X and Y must have the same number of columns.');
end
if N < 3; return; end

% Make sure x is monotonically increasing.
[x, indx] = unique(x(1, :));
y = y(:, indx); n = numel(x);
if n < 3; return; end
if n <= ntarget
  u = x; v = y;
  return;
end

% Equalize X and Y variances.
xsigma = std(x(:));
ysigma = std(y(:))./size(y, 1);
y = (xsigma./ysigma).*y;

% Non-linear upsampling.
n = numel(x);
z = mean(y, 1);
t = interp1((1:n)./n, x, linspace(1/n, 1, RES*n), 'linear');
q = spline(x, z, t);

% Compute 1st differences from non-linear path.
dt = diff(t); dt = 0.5*([dt(1) dt] + [dt dt(end)]);
dq = diff(q); dq = 0.5*([dq(1) dq] + [dq dq(end)]); 
d = sqrt(dt.*dt + dq.*dq);
trail = cumsum(d);

% Compute 2nd differences from original curve.
dx = diff(x); dx = 0.5*([dx(1) dx] + [dx dx(end)]);
dz = diff(z); dz = 0.5*([dz(1) dz] + [dz dz(end)]); 
dx2 = diff(dx); dx2 = 0.5*([dx2(1) dx2] + [dx2 dx2(end)]);
dz2 = diff(dz); dz2 = 0.5*([dz2(1) dz2] + [dz2 dz2(end)]); 
d2 = sqrt(dx2.*dx2 + dz2.*dz2);
d2 = interp1((1:n)./n, d2, linspace(1/n, 1, RES*n), 'linear');

% Detect linear segments first.
starts = [];
indx = [find(d2 < 10*eps) (numel(d2) + 2)];
stops = [find(diff(indx) > 1)];
if isempty(stops) stops = []; end % for Octave to work
starts = [min(indx) indx(stops + 1)];
stops = [indx(stops) starts(end)];

% Sample linear segments with two points only.
pos = [];
n = numel(trail);
for k = find(starts < stops)
  start = max(2, (starts(k) - RES));
  stop = min((n - 1), (stops(k) + RES));
  trail(start:end) = (trail(start:end) - trail(stop) + trail(start)); 
  trail(start:stop) = trail(stop);
  pos = [pos starts(k) stops(k)];
end

% Remove redundant points.
if numel(pos) > 0
  dp = diff(pos); dp = 0.5*([dp(1) dp] + [dp dp(end)]);
  pos = pos(find(dp >= RES));
end

% Create new sampling points.
accu = 0;
incr = trail(end)./numel(x);
for j = 1:numel(trail)
  if trail(j) < accu; continue; end
  accu = (trail(j) + incr);
  pos = [pos j];
end

% Check sampling density.
if isempty(ntarget); ntarget = numel(x)/2; end
ntarget = max(3, round(ntarget(1)));

% Create new coordinate space.
pos = unique([1 pos n]);
a = ((1:numel(pos)) - 1);
b = ((1:ntarget) - 1);
u = interp1(a./a(end), t(pos), b./b(end), 'linear');
v = NaN*ones(M, ntarget);

% Resample according to new x-coordinate space.
st = [];
du = median(diff(u));
for i = 1:M
  v(i, :) = spline(x, y(i, :), u);
  st = progmonit('simplify', i/M, 5, st);
end

% Restore original scale.
v = (ysigma./xsigma).*v;
progmonit('simplify', 1, 5, st);

return;

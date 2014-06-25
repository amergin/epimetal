%IRANKTF  Inverse rank transform.
%   YPS = IRANKTF(R, Y)
%   R     M x N matrix of normalized ranks, where M denotes the
%         number of samples. Any values outside [-1, 1] are
%         extrapolated based on the reference vector and might not
%         be accurate.
%   Y     K x N matrix of reference values that are used when
%         estimating the abolute values from the ranks.
%   YPS   M x N matrix of absolute values.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function yps = iranktf(r, y);
yps = [];
  
% Check inputs.
[M, N] = size(r);
[My, Ny] = size(y);
if N ~= Ny
  error('R and Y must have the same number of columns.');
end
if M*My < 1
  return;
end

% Remove missing reference values.
m = My;
for j = 1:Ny
  index = find(0*y(:, j) == 0);
  m = min(m, numel(index));
  if m < 10  
    error(sprintf('Less than 10 points in column %d.', j));
  end
end
  
% Compute inverse transform.
r = (r + 1)/2;
yps = NaN*r; st = [];
for j = 1:N
  rj = r(:, j);
  yj = y(find(0*y(:, j) == 0), j);  
  yj = sort(yj);
  dy = mean(diff(yj));
  
  m = numel(yj);  
  for i = 1:M
    pos = (rj(i)*(m - 1) + 1);
    down = floor(pos);
    up = ceil(pos);
      
    % Smaller bin edge.
    alpha = NaN;
    if (down > 0) & (down <= m)
      alpha = yj(down);
    else
      if down <= 0
        alpha = (yj(1) + (down - 1)*dy);
      else
        alpha = (yj(m) + (down - m)*dy);
      end
    end

    % Larger bin edge.
    beta = NaN;
    if (up > 0) & (up <= m)
      beta = yj(up);
    else
      if up <= 0
        beta = (yj(1) + (up - 1)*dy);
      else
        beta = (yj(m) + (up - m)*dy);
      end
    end
    
    % Trapezoid approximation.
    if down == up
      yps(i, j) = alpha;
    else
      yps(i, j) = ((pos - down)*beta + (up - pos)*alpha);     
    end
  end
  st = progmonit('iranktf', j/N, 5, st);
end
progmonit('iranktf', 1, 5, st);

return;

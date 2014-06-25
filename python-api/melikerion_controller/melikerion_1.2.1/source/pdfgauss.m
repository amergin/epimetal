%PDFGAUSS  Density function for the Gaussian distribution.
%   Y = PDFGAUSS(X, MU, SIGMA)
%   X     M x N matrix of x-coordinates.
%   MU    Distribution mean.
%   SIGMA Distribution scale (square root of variance).
%   Y     M x N matrix of y-coordinates.
%
%   Copyright (C) 2008 Ville-Petteri Makinen
%   This function is free software; you can redistribute it and/or modify
%   it under the terms of the GNU General Public License as published by
%   the Free Software Foundation; see the license file for details.
%
%   Octave/Matlab compatible.

function y = pdfgauss(x, mu, sigma);
sigma = max(sigma(1), eps);
x = (x - mu(1))./sigma;
y = exp(-0.5.*x.^2)./sqrt(2*pi)./sigma;
return;

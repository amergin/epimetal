% Examples of self-organizing map analysis.
% Written by Ville-Petteri Mäkinen 2008.

% Semi-supervised analysis for a categorical variable. This type of analysis
% has not yet been validated, but if you have a dataset with a large number
% of variables only a few of which are relevant, this approach might produce
% better results than the unsupervised mode. The script should be executed
% in the same directory as the dataset, otherwise it may not work.
% Tested on Octave 3.0, Ubuntu Linux.
function demo2;
RDIR = 'results2/';

% Load data.
runscript('dataset.m');

% Sample codes.
[dummy, j] = cellisect(header, 'ID');
id = data(:, j);

% Input variables.
varnames = {
  'Serum1'
  'Serum2'
  'Serum3'
  'Serum4'
  'Serum5'
  'Urine1'
  'Urine2'
  'Urine3'
  'Urine4'
}';
[dummy, cols] = cellisect(header, varnames);
x = data(:, cols);
xheader = {header{cols}};

% Response variables.
[dummy, j] = cellisect(header, 'Categ1');
[y, yheader] = binarize(data(:, j), header{j}, 5);

% Test variables.
varnames = {
  'Diagn1'
  'Diagn2'
  'Diagn3'
  'Body1'
  'Body2'
  'Body3'
}';
[dummy, cols] = cellisect(header, varnames);
t = data(:, cols);
theader = {header{cols}};

% Normalize input data.
z = standize(x);

% Construct self-organizing map.
sm = somcreate(z, xheader);
[sm, bmus, zi, eta] = somtrain(sm, z, y);

% Save best-matching units, imputed inputs and estimated responses.
if ~isdir(RDIR); mkdir(RDIR); end
ascprint([RDIR 'bmus.txt'], [id bmus], {'ID', 'ROW', 'COLUMN'});
ascprint([RDIR 'imputed_inputs.txt'], [id zi], {'ID', xheader{:}});
ascprint([RDIR 'estimated_responses.txt'], [id eta], {'ID', yheader{:}});

% Map diagnostics.
somvisproto(sm, [], [], RDIR);
somvisquality(sm, z, id, RDIR);

% Estimate dynamic range only.
xstats = somtest(sm, bmus, x, 0);
ystats = somtest(sm, bmus, y, 0);

% Estimate dynamic range and statistical significance.
tstats = somtest(sm, bmus, t, 500);

% Create map colorings (component planes). You should always combine
% statistics for all variables and use a single function call to create
% the colorings; this way the colors will be comparable between variables.
somvisplane(sm, bmus, [x y t], {xheader{:}, yheader{:}, theader{:}}, ...
            [xstats ystats tstats], RDIR);

return;

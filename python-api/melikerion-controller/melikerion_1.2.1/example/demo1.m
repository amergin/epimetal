% Examples of self-organizing map analysis.
% Written by Ville-Petteri Mäkinen 2008.

% Unsupervised analysis with statistical significance estimates for
% test variables. The script should be executed in the same directory
% as the dataset, otherwise it may not work.
% Tested on Octave 3.0, Ubuntu Linux.
function demo1;

% determine task id
args = argv();
exec = args{size(args)(1),1};
task_id = strsplit(exec, " "){1,2};

RDIR = strcat(task_id, "/");
%'results1/';

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

% Test variables.
varnames = {
  'Categ1'
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

% Break categorical test variables into multiple binary indicators.
[t, theader] = binarize(t, theader, 5);

% Construct self-organizing map.
sm = somcreate(z, xheader);
[sm, bmus, zi] = somtrain(sm, z);

% Save best-matching units and imputed inputs.
if ~isdir(RDIR); mkdir(RDIR); end
disp(id);
disp(size(id));
ascprint([RDIR 'bmus.txt'], [id bmus], {'ID', 'ROW', 'COLUMN'});
ascprint([RDIR 'imputed_inputs.txt'], [id zi], {'ID', xheader{:}});

% Map diagnostics.
somvisproto(sm, [], [], RDIR);
somvisquality(sm, z, id, RDIR);

% Estimate dynamic range and statistical significance. Set the number of
% simulations to zero for input variables.
xstats = somtest(sm, bmus, x, 0);
tstats = somtest(sm, bmus, t, 500);

% Create map colorings (component planes). You should always combine
% statistics for all variables and use a single function call to create
% the colorings; this way the colors will be comparable between variables.
somvisplane(sm, bmus, [x t], {xheader{:}, theader{:}}, [xstats tstats], RDIR);

return;

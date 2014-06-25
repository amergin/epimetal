#{  
Input parameters: 
objectID: Unique ObjectID for this task execution. Used to form a temp directory for files
inputFileName: (absolute path) of a file name, containing JSON structure containing:
input.variables = variables used for SOM computation
input.samples = {var1: [...], var2: [...]}
#}

function createsom(objectID, inputFileName);

% Disable output to stdout
#{
PAGER('true > /dev/null');
page_screen_output(1);
page_output_immediately(1);
#}

% Constants
SM_FILENAME = 'results_sm.json';
BMUS_FILENAME = 'results_bmus.txt';
ZI_FILENAME = 'results_zi.txt';
XSTATS_FILENAME = 'results_xstats.json';

IDS_FILENAME = 'results_ids.txt';

% move to working directory
RDIR = strcat(objectID, "/");
chdir( RDIR );

% contains 'variables' to be used, and 'samples' of these vars
input = loadjson(inputFileName);
id = input.samples.id';

x = [];
xheader = {};


variableNames = fieldnames( input.samples(1) );
for i=1:size(variableNames,1)  %variables,2)
	fieldName = variableNames{i};

	if( strcmp( fieldName, "id" ) ) 
		continue
	endif
	xheader{end+1} = fieldName;

	field = getfield( input.samples(1), fieldName );
	x = [x field'];
end

% Normalize input data.
z = standize(x);

% Construct self-organizing map.
sm = somcreate(z, xheader);
[sm, bmus, zi] = somtrain(sm, z);

% Write SM to json
savejson('', sm, SM_FILENAME);

% Write BMUs

%savejson('', id, IDS_FILENAME);
ascprint( BMUS_FILENAME, bmus, {'ROW', 'COLUMN'} );
%ascprint( BMUS_FILENAME, [id bmus], {'ID', 'ROW', 'COLUMN'} );

% Write ZI
ascprint(ZI_FILENAME, zi, xheader);

% Estimate dynamic range and statistical significance. Set the number of
% simulations to zero for input variables.
xstats = somtest(sm, bmus, x, 0);
savejson('', xstats, XSTATS_FILENAME);

return;
% --------------------------------------------------------


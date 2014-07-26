function create_visplane(workPath, inputFileName);

% Disable output to stdout
%PAGER('true > /dev/null');
page_screen_output(0);
page_output_immediately(1);

% Constants
SM_FILENAME = 'input_sm.json';
BMUS_FILENAME = 'input_bmus.txt';
ZI_FILENAME = 'input_zi.txt';
XSTATS_FILENAME = 'input_xstats.json';

% move to working directory
RDIR = strcat(workPath, "/");
chdir( RDIR );

% Read files from task directory
sm = loadjson( SM_FILENAME );

xstats = cell2mat( loadjson( XSTATS_FILENAME ) );

bmuMatrix = dlmread( BMUS_FILENAME )(2:end,:);
bmus = bmuMatrix(:,1:end);
%id = bmuMatrix(:,1);

% read header from first row
[fid, mode] = fopen(ZI_FILENAME, 'r');
line = fgetl(fid);
xheader = strsplit(line, char(9), true);
xheader(1) = [];
fclose(fid);

% skip ID column
zi = dlmread( ZI_FILENAME )(2:end,2:end); %(2:end);

input = loadjson( inputFileName );

%xheader = input.inputvars;
%theader = { input.testvar };

xVariableNames = fieldnames( input.inputvars );
tVariableName = fieldnames( input.testvar ){1};

x = [];
for i=1:size(xVariableNames,1)
	varName = xVariableNames{i};
	inputField = getfield( input.samples(1), varName );
	x = [x inputField'];
end

t = getfield( input.samples(1), tVariableName )';

tstats = somtest(sm, bmus, t, 500);

hexmap = somvisplane(sm, bmus, t, tVariableName, tstats, RDIR);
%hexmap = somvisplane(sm, bmus, [x t], {xVariableNames{:}, tVariableName}, [xstats tstats], RDIR);
% save the map cell values as json file
writeplanefiles( hexmap, RDIR );

return;
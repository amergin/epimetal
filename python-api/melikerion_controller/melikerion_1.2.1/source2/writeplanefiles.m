function writeplanefiles(hexmaps, path)

prefix = 'results_plane';
suffix = '.json';

for i = 1:size(hexmaps,2)
	savejson('', hexmaps{1,i}, [path prefix suffix]);
end

return;
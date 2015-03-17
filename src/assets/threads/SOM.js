

if (typeof window !== 'undefined') {
	SOM = window.SOM || {};	  
}





SOM = function() {

	function create(rows,cols,sampleids,data) {
		var som = {};
		som.epoch = 0;
		som.rows = rows;
		som.cols = cols;
		som.M = 5;
		som.N = 10000;
		// som.batch_sample_size = 200;
		som.sampleids = [];

		som.variablenames = [];
		
		som.codebook = [] 
		som.distances = [] 
		som.weights = [] 

		som.maxdistance = 0;
		som.coords = [];
		som.samples = new Float32Array(som.N*som.M);

		som.numEpochs = som.rows*som.cols * 0.5;
		som.start_neigh_dist = Math.max(som.rows,som.cols);
		som.end_neigh_dist = 0.5;
		som.input_min = [];
		som.input_max = [];
		som.neighdist = som.start_neigh_dist;
		som.bmus = new Float32Array(som.N);

		set_training_data(som,sampleids,data);

		return som;
	}


	function normalcdf(mean, sigma, to) 
	{
	    var z = (to-mean)/Math.sqrt(2*sigma*sigma);
	    var t = 1/(1+0.3275911*Math.abs(z));
	    var a1 =  0.254829592;
	    var a2 = -0.284496736;
	    var a3 =  1.421413741;
	    var a4 = -1.453152027;
	    var a5 =  1.061405429;
	    var erf = 1-(((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-z*z);
	    var sign = 1;
	    if(z < 0)
	    {
	        sign = -1;
	    }
	    return (1/2)*(1+sign*erf);
	}



	//-------------------------------------------------------------------------------------------------------
	function get_formatter_bmus(som) {


		var return_values = [];

		for(var i=0;i<som.N;i++) {

			return_values.push( {	'x' : som.bmus[i] % som.cols, 
									'y' : Math.floor(som.bmus[i] / som.cols),  
									'sample' : som.sampleids[i]
								});
		}

		return return_values;


	}



	//-------------------------------------------------------------------------------------------------------
	function get_best_matching_units(som, units, samples) {

		var mindist = -1;
		var minind = -1;
		var diffsum = 0;
		var currentbmus = new Float32Array(samples.length / som.M);
		var n_units = units.length / som.M;


		for(var s =0;s<currentbmus.length;s++) {
			mindist = -1;
			minind = -1;
			for(var u=0;u<n_units;u++) {
				
				diffsum = 0;

				for(var i=0;i<som.M;i++) {
					diffsum += (units[u*som.M + i] - samples[s*som.M+i])*(units[u*som.M + i] - samples[s*som.M+i]);
				}

				if(mindist < 0 || diffsum < mindist ) {

					mindist = diffsum;
					minind = u;
				}
			
			}
			
			currentbmus[s] = minind;
		}
		

		return currentbmus;

	}

	//-------------------------------------------------------------------------------------------------------
	function ensureFloat32Array(obj) {

		var t = Object.prototype.toString.call(obj);
		

		switch(t) {

			case "[object Array]":
			case "[object Object]":


				var newarr = new Float32Array(Object.keys(obj).length);
				
				var i=0;
				for(p in obj) {
					newarr[i] = obj[p];
					i++;
				}
				return newarr;


			case "[object Float32Array]" :

				return obj;

			default: 
				console.log('ensureFloat32Array warning: Unidentified type');

		}
		return obj;

	}


	//-------------------------------------------------------------------------------------------------------
	function calculate_component_plane(som, sampleids, data_column, variable_name) {


		data_column = ensureFloat32Array(data_column);
		som.codebook = ensureFloat32Array(som.codebook);
		som.samples = ensureFloat32Array(som.samples);
		som.distances = ensureFloat32Array(som.distances);
		som.bmus = ensureFloat32Array(som.bmus);
		som.weights = ensureFloat32Array(som.weights);


		console.log('calculating component plane');

		som.bmus = get_best_matching_units(som, som.codebook, som.samples);

		valuearr = []; 
		var index;

		var currentbmusarr = [];

		for(var i=0;i<data_column.length;i++) {

			index = _.findIndex(som.sampleids, sampleids[i]);
			if(index < 0) {
				console.log('Sample' + sampleids[i] + " not found");
				continue;
			}

			if(!isNaN(data_column[i])) {
				valuearr.push(data_column[i]);
				currentbmusarr.push(som.bmus[index]);
			}

		}

		values = new Float32Array(valuearr.length);
		currentbmus = new Float32Array(valuearr.length);

		for(var i=0;i<valuearr.length;i++) {
			values[i] = valuearr[i];
			currentbmus[i] = currentbmusarr[i];
		}
		
		//console.log(values);
		

		var color_scale = ["#4682b4","#5e8fbc","#759dc5","#89a9cd","#9db8d5","#b1c6de","#c5d3e6","#d8e1ee","#ecf0f7","#ffffff","#fff1ef","#ffe5e0","#ffd7cf","#ffc9c0","#ffbbb0","#ffada0","#ff9d90","#fd8f80","#fa8072"];

		
		var average_values = new Float32Array(som.rows*som.cols);

		var samples_in_cell = new Int16Array(som.rows*som.cols);


		// Random permutations

		var Nperm = 10000;
		var shuffled_bmus;
		var variances = new Float32Array(Nperm);
		var plane_mean;
		var plane_variance;

		
		for(var it=0;it<Nperm;it++) {



			for(var i=0; i<som.rows*som.cols; i++) {
				average_values[i] = 0;
				samples_in_cell[i] = 0;
			}

			shuffled_bmus = _.shuffle(currentbmus);

			
			for(var i=0; i<shuffled_bmus.length; i++) {
				if(!isNaN(values[i])) {
					average_values[shuffled_bmus[i]] += values[i];
					samples_in_cell[shuffled_bmus[i]]++;
				} else {
					console.log('NaN');
				}
			}
			
			plane_mean = 0;

			// Calculating averages for each cell
			for(var i=0; i<som.rows*som.cols; i++) {
				
				if(samples_in_cell[i]  > 0) {

					average_values[i] = average_values[i] / samples_in_cell[i];
				}
			}

			
			for(var i=0; i<som.rows*som.cols; i++) {
				
				/* If no samples in cell, interpolate value from 
				surroundings */
				if(samples_in_cell[i]  == 0) {

					average_values[i] = 0;
					cw = 0;
					for(var j=0;j<som.rows*som.cols; j++) {			
						
						if(samples_in_cell[j] > 0) {
							w = som.weights[j*som.rows*som.cols + i];
							cw += w;
							average_values[i] += w * average_values[j];
						} 
					}

					average_values[i] = average_values[i] / cw;
				}


				plane_mean += average_values[i];
			}


			
			plane_mean = plane_mean / (som.rows*som.cols);


			plane_variance = 0;

			for(var i=0; i<som.rows*som.cols; i++) {
				
				plane_variance += ((average_values[i] - plane_mean)*(average_values[i] - plane_mean));
			}

			plane_variance = plane_variance / (som.rows*som.cols);
			
			variances[it] = plane_variance;

		}


	/*	console.log('Permuted variances');
		console.log(variances);  */

		var null_mean = 0;
		var null_stddev = 0;

		for(it=0;it<Nperm;it++) {
			null_mean += variances[it];
		}

		null_mean = null_mean / Nperm;

/*		console.log('Null mean');
		console.log(null_mean); */

		for(it=0;it<Nperm;it++) {
			null_stddev += ((variances[it] - null_mean)*(variances[it] - null_mean));
		}

		null_stddev = Math.sqrt(null_stddev / Nperm);

/*		console.log('Null stddev');
		console.log(null_stddev); */

		// Final coloring

		var data_mean = 0;
		var N_not_nan = 0;
		
		for(var i=0; i<som.rows*som.cols; i++) {
				average_values[i] = 0;
				samples_in_cell[i] = 0;
		}

		for(var i=0; i<currentbmus.length; i++) {

			
			average_values[currentbmus[i]] += values[i];
			samples_in_cell[currentbmus[i]]++;
			data_mean += values[i];
			N_not_nan++;
		

		}

		data_mean = data_mean / N_not_nan;

		plane_mean = 0;
		plane_variance = 0


		// Calculating averages for each cell
		for(var i=0; i<som.rows*som.cols; i++) {
			
			if(samples_in_cell[i]  > 0) {

				average_values[i] = average_values[i] / samples_in_cell[i];
			}
		}


		for(var i=0; i<som.rows*som.cols; i++) {
			
			/* If no samples in cell, interpolate value from 
			surroundings */
			if(samples_in_cell[i]  == 0) {

				average_values[i] = 0;
				cw = 0;
				for(var j=0;j<som.rows*som.cols; j++) {			
					
					if(samples_in_cell[j] > 0) {
						w = som.weights[j*som.rows*som.cols + i];
						cw += w;
						average_values[i] += w * average_values[j];
					} 
				}

				average_values[i] = average_values[i] / cw;
			}


			plane_mean += average_values[i];
		}

		
		plane_mean = plane_mean / (som.rows*som.cols);

		plane_variance = 0;

		for(var i=0; i<som.rows*som.cols; i++) {
			
			plane_variance += ((average_values[i] - plane_mean)*(average_values[i] - plane_mean));
		}

		plane_variance = plane_variance / (som.rows*som.cols);


	/*	console.log('Real variance');
		console.log(plane_variance);


		console.log('Norm cdf ');
		console.log(normalcdf(null_mean, null_stddev, plane_variance));
*/

		var pvalue = 1 - normalcdf(null_mean, null_stddev, plane_variance);

		console.log('pvalue ');
		console.log(pvalue);
		// SMoothing

		update_weights(som, 1.5);
/*		som.neighdist = 2;
		var map_distance_to_weight = new Float32Array(som.maxdistance+1); 
		for(var i=0;i<=som.maxdistance;i++) {
			map_distance_to_weight[i] = get_neighbourhood_coeff(i);
		}

		console.log("Weights");
		console.log(map_distance_to_weight); */

		var cw = 0;
		var w = 0;

		var smooth_averages = new Float32Array(som.rows*som.cols);

		for(var i=0;i<som.rows*som.cols; i++) {

			cw = 0;

			smooth_averages[i] = 0;

			for(var j=0;j<som.rows*som.cols; j++) {			
			
				w = som.weights[j*som.rows*som.cols + i];
				cw += w;
				smooth_averages[i] += w * average_values[j];
			
			}

			smooth_averages[i] = smooth_averages[i] / cw;
			

		}		



		// -- drawing the plane


		console.log(smooth_averages);

		var maxvalue = _.max(smooth_averages);
		var minvalue = _.min(smooth_averages);
		
		var range = _.max([maxvalue - data_mean, data_mean - minvalue ]) * 2;
		
		// Adjusting the color range according to the statistical significance (p-value)

		range = _.max([range,  (-0.5 * (-Math.log10(pvalue)-3) -0.5 )*range + range]);

		var color_indices = new Float32Array(som.rows*som.cols);

		var plane_object = {}
		plane_object['cells'] = [];
		plane_object['labels'] = [];
		plane_object['variable'] = variable_name;
		plane_object['pvalue'] = pvalue;
		plane_object['size'] = { 'm' : som.rows, 'n': som.cols };



		for(var i=0; i<som.rows*som.cols; i++) {

			color_indices[i] =  Math.floor(18*(0.5 + (smooth_averages[i] - data_mean) / range));

			plane_object.cells.push({'x' : i % som.cols + 1, 'y' : Math.floor(i/som.cols) + 1, 'color' : color_scale[color_indices[i]] });

		}

		var step = (maxvalue-minvalue)/7;
		var stops = [minvalue, maxvalue].concat(_.range(minvalue+step, maxvalue-step, step));


		var label_places = _.range(1,som.rows*som.cols);


		for(var j=0;j<stops.length;j++) {

			var sorted = _.sortBy(label_places, function(n) {
				return Math.abs(smooth_averages[n] - stops[j]);
			});

			var i = sorted[0];

			var new_places = [];

			for(var k=1; k<label_places.length; k++) {
				if(som.distances[i * som.rows*som.cols + label_places[k]] > 2 ) {
					new_places.push(label_places[k]);
				}	
			}

			label_places = new_places;

			plane_object.labels.push({'x' : i % som.cols + 1, 'y' : Math.floor(i/som.cols) + 1, 'color' : '#000000' , 'label' : nice_round(smooth_averages[i]) });

			if(label_places.length == 0) break;

		}


		return plane_object;

	}


	function nice_round(val) {

		var ret = "";

		var exp = Math.floor(Math.log10(val));

		if(Math.abs(exp) > 3) {
			ret = Math.round(val * Math.pow(10,-exp)*100)/100 + "E" + exp;
		} else {
			ret = Math.round(val * Math.pow(10,-exp)*100)/(100 * Math.pow(10,-exp));
		}

		return ret;

	}

	function train(som) {
		console.log('Start SOM training');

		som.codebook = ensureFloat32Array(som.codebook);
		som.samples = ensureFloat32Array(som.samples);
		som.distances = ensureFloat32Array(som.distances);
		som.bmus = ensureFloat32Array(som.bmus);
		som.weights = ensureFloat32Array(som.weights); 

		run_SOM_epoch(som);
	}


	//-------------------------------------------------------------------------------------------------------
	function run_SOM_epoch(som) {

/*
		var currentsampleindices = _.sample(_.range(0,som.N), som.batch_sample_size);

		var currentsamples = new Float32Array(som.batch_sample_size * som.M);
		var c = 0;
		for(var i=0;i<som.batch_sample_size;i++) {
			for(var j=0;j<som.M;j++) {

				currentsamples[c] = som.samples[currentsampleindices[i]*som.M + j];
				c++;

			}
		} */

		currentsamples = som.samples;

		var current_bmus, 
			new_neighbourhood_radius = som.start_neigh_dist,
			cw = 0,
			w = 0;
		


		var total_number_of_epochs = Math.ceil(-Math.log2(som.end_neigh_dist / som.start_neigh_dist)) * som.numEpochs;

		while(new_neighbourhood_radius > som.end_neigh_dist) {

			// Find bmus
			current_bmus = get_best_matching_units(som, som.codebook, currentsamples);

			//var bmus = _.map(currentsamples, function(i) { return get_best_matching_unit(codebook, i); });
			
			//var neighbourhood_radius = som.start_neigh_dist *  Math.pow(som.end_neigh_dist / som.start_neigh_dist, (som.epoch/som.numEpochs) );
			new_neighbourhood_radius = som.start_neigh_dist / Math.pow(2,Math.floor(((som.epoch + 1) / som.numEpochs)));

			

			if(new_neighbourhood_radius != som.neighdist) {
				
				console.log( Math.round(som.epoch / total_number_of_epochs * 100) + "%, neighbourhood radius: " + new_neighbourhood_radius);

				update_weights(som, new_neighbourhood_radius);
				
				
			}

			// Update som
			cw = 0;
			w = 0;

			for(var i=0;i<som.rows*som.cols; i++) {

				cw = 0;

				for(var m=0;m<som.M;m++) {
					som.codebook[i*som.M + m] = 0;
				}

				for(var j=0;j<current_bmus.length;j++) {
					w = som.weights[current_bmus[j]*som.rows*som.cols + i];
					cw += w;
					for(var m=0;m<som.M;m++) {
						som.codebook[i*som.M + m] += w * currentsamples[j*som.M + m];
					}				
				}

				for(var m=0;m<som.M;m++) {
					som.codebook[i*som.M + m] = som.codebook[i*som.M + m] / cw;
				}


			}

			som.epoch = som.epoch + 1;

		}
		
		som.bmus = get_best_matching_units(som, som.codebook, som.samples);

		console.log('SOM training finished');


	}

	//-------------------------------------------------------------------------------------------------------
	function preprocess_som_samples(som, original_values) {

		som.samples = new Float32Array(som.M * som.N);
		som.input_min = new Float32Array(som.M);
		som.input_max = new Float32Array(som.M);

		var val = 0;

		for(var j=0;j<som.M;j++) {

			var arr = [];
			for(var i=0;i<som.N;i++) {
				arr.push(original_values[i*som.M+j]);
			}

			som.input_min[j] = 0; //_.min(arr);
			som.input_max[j] = 1; //_.max(arr);

			var sorted = arr.slice().sort(function(a,b){return b-a});
			var ranks = arr.slice().map(function(v){ return sorted.indexOf(v)+1 });

			for(var i=0;i<som.N;i++) {

				//som.samples[i*som.M+j] = arr[i];
				if(isNaN(arr[i])) {
					som.samples[i*som.M+j] = 0.5;
				} else {
					val = 2 * (ranks[i] / som.N) - 1;
					som.samples[i*som.M+j] = ((val + val*val*val) + 2)/4;

				}
				
			}


		}



	}

	//-------------------------------------------------------------------------------------------------------
	function set_training_data(som, sampleids, data_columns) {

		som.sampleids = sampleids;

		som.N = sampleids.length;
		som.M = data_columns.length;

		// som.batch_sample_size = _.min([som.N, 2000]);
		som.bmus = new Float32Array(som.N);

		// These will be converted to ranks
		var original_values = new Float32Array(som.M*som.N);

		// Populating the 1D Float32Array 
		for(var i=0;i<data_columns[0].length;i++) {
			for(var j=0;j<data_columns.length;j++) {
				original_values[i*som.M+j] = data_columns[j][i];
			}
		}

		precalculate_distances(som);

		preprocess_som_samples(som, original_values);

		init_prototype_vectors(som);

	}


	//-------------------------------------------------------------------------------------------------------
	// Precalculates distances between SOM cells
	//
	// See: http://keekerdc.com/2011/03/hexagon-grids-coordinate-systems-and-distance-calculations/
	//
	function precalculate_distances(som)  {

		som.coords = new Array(som.rows*som.cols);


		for (var dest_r=0; dest_r<som.rows; dest_r++) {
	        for (var dest_c=0; dest_c<som.cols; dest_c++) {

	        	var dest_x = 0.5 + dest_c + (1 - dest_r % 2) * 0.5;
	        	var dest_y = 0.5 + Math.sqrt(0.75)*dest_r;
	        	
	        	som.coords[dest_r*som.cols + dest_c] = {x: dest_x, y: dest_y};

	            
	        }
	    }

	    var distance;

	    for(var src_i = 0; src_i < som.rows*som.cols; src_i++) {
			
			for(var dest_i = 0; dest_i < som.rows*som.cols; dest_i++) {

				distance = (som.coords[dest_i].x - som.coords[src_i].x)*(som.coords[dest_i].x - som.coords[src_i].x) + (som.coords[dest_i].y - som.coords[src_i].y)*(som.coords[dest_i].y - som.coords[src_i].y);
				distance = Math.sqrt(distance);

				/*Math.max(Math.abs(coords[dest_i].x - coords[src_i].x), 
														 Math.abs(coords[dest_i].y - coords[src_i].y),
														 Math.abs(coords[dest_i].z - coords[src_i].z)  ); */
				som.distances[ src_i*som.rows*som.cols + dest_i ] = distance;
				
				if(som.maxdistance < distance) {
					som.maxdistance = distance;
				}


			}
	    }


	}


	function update_weights(som, radius) {

		som.neighdist = radius;
		var d;

		for(var src_i = 0; src_i < som.rows*som.cols; src_i++) {
			
			for(var dest_i = 0; dest_i < som.rows*som.cols; dest_i++) {

				d = som.distances[ src_i*som.rows*som.cols + dest_i ];

				som.weights[src_i*som.rows*som.cols + dest_i] = Math.exp( - d*d / (radius * radius) );
				

			}
	    }

	}

	

	//-------------------------------------------------------------------------------------------------------

	function calc_weighted_average(som, weights, vectors) {

		var result = _.map(vectors[0], function() {return 0;});
		var wsum = 0;

		for(var i=0;i<vectors.length;i++) {
			for(var j=0;j<result.length;j++) {
				result[j] = result[j] + weights[i] * vectors[i][j];
			}
			wsum += weights[i];		
		}

		result = _.map(result, function(r) { return r/wsum; });
		return result;

	}

	//-------------------------------------------------------------------------------------------------------
	function calc_average(som, vectors) {

		var result = _.map(vectors[0], function() {return 0;});
		var wsum = 0;

		for(var i=0;i<vectors.length;i++) {
			for(var j=0;j<result.length;j++) {
				result[j] = result[j] + vectors[i][j];
			}
			wsum += 1;	
		}

		result = _.map(result, function(r) { return r/wsum; });
		return result;
	}
	//-------------------------------------------------------------------------------------------------------

	function init_prototype_vectors (som) {
	    

		// Initializing 4 random centroids

		som.codebook = new Float32Array(som.rows*som.cols*som.M);

		var centroids = new Float32Array(som.M*4);


		// Centroid 1, zero values
		i=0;
		for(var m=0;m<som.M;m++) {
			centroids[i*som.M+m] = 0;
		}

		// Centroid 2, ladder up
		i=1;
		for(var m=0;m<som.M;m++) {
			centroids[i*som.M+m] = m/som.M;
		}

		// Centroid 3, ladder down
		i=2;
		for(var m=0;m<som.M;m++) {
			centroids[i*som.M+m] = 1 - m/som.M;
		}

		// Centroid 4, ones
		i=3;
		for(var m=0;m<som.M;m++) {
			centroids[i*som.M+m] = 1;
		}
		


		// Running k-Means clustering
		
		var kmeans_t = 0, kmeans_T = 1000;
		var current_bmus;


		var centroid_cw = new Float32Array(4);

		while(kmeans_t<kmeans_T) {
		
			current_bmus = get_best_matching_units(som, centroids, som.samples);

			for(var i=0;i<4;i++) {
				for(var m=0;m<som.M;m++) {
					centroids[i*som.M+m] = 0;
				}
				centroid_cw[i] = 0;
			}

			for(var i=0;i<current_bmus.length;i++) {
				centroid_cw[current_bmus[i]]++;
				for(var m=0;m<som.M;m++) {
					centroids[current_bmus[i]*som.M + m] += som.samples[i*som.M + m];
				}
			}

			for(var i=0;i<4;i++) {
				for(var m=0;m<som.M;m++) {
					centroids[i*som.M+m] = centroids[i*som.M+m] / centroid_cw[i];
				}
			}

			kmeans_t++;
			
		}




		update_weights(som, som.start_neigh_dist);

		var centroid_bmus = [0,som.cols-1,(som.rows-1)*som.cols + som.cols-1,(som.rows-1)*som.cols];
		
		// Update som
		var cw = 0;
		var w = 0;

		for(var i=0;i<som.rows*som.cols; i++) {

			cw = 0;

			for(var m=0;m<som.M;m++) {
				som.codebook[i*som.M + m] = 0;
			}

			for(var j=0;j<4;j++) {
				w = som.weights[centroid_bmus[j]*som.rows*som.cols + i];
				cw += w;
				for(var m=0;m<som.M;m++) {
					som.codebook[i*som.M + m] += (w * centroids[j*som.M + m]);
				}				
			}

			for(var m=0;m<som.M;m++) {
				som.codebook[i*som.M + m] = som.codebook[i*som.M + m] / cw;
			}


		}


	}

	return { 	"create" : create, 
				"set_training_data" : set_training_data, 
				"train" : train,
				"get_formatter_bmus" : get_formatter_bmus,
				"calculate_component_plane" : calculate_component_plane };


}();




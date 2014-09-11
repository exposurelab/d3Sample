function drawMap(){
	// Define map
	var map = d3.select("svg")

	// Define svg canvas margin
	var margin = {top: 20, right: 20, bottom: 20, left: 20};

	// Define svg canvas width and height
	var width = 960 - margin.right - margin.left,
		height = 800 - margin.top - margin.bottom;

	// Define projection
	projection = d3.geo.mercator()
					.center([120.9579531, 23.978567])
					.scale(6000)
					.translate([width/2, height/2]);

	// Define svg path properties
	path = d3.geo.path()
			.projection(projection);

	// Define color properties
	var color = d3.scale.quantize()
					.range(["rgb(166,54,3)",									
							"rgb(230,85,13)",
							"rgb(253,141,60)",
							"rgb(253,174,107)",
							"rgb(253,190,133)"																 
						]);

	// Define zoom function
	var zoom = d3.behavior.zoom()
				.translate([0, 0])
				.scale(1)
				.scaleExtent([1, 40])
				.on("zoom", function(){
	                var t = d3.event.translate;
	                var s = d3.event.scale;

	                var w_max = 0;
	                var w_min = width * (1 - s);
	                var h_max = height < s*width/2 ? s*(width/2-height)/2 : (1-s)*height/2;
	                var h_min = height < s*width/2 ? -s*(width/2-height)/2-(s-1)*height : (1-s)*height/2;

	                t[0] = Math.min(w_max, Math.max(w_min, t[0]));
	                t[1] = Math.min(h_max, Math.max(h_min, t[1]));

	                zoom.translate(t);
	                g.attr("transform", "translate(" + t + ")scale(" + s + ")");
	                g.selectAll("path").style("stroke-width", .5 / s + "px");
            	});

	// Create svg object
	var svg = d3.select("div#svg").append("svg")
				.attr("width", width + margin.right + margin.left)
				.attr("height", height + margin.top + margin.bottom)
				.call(zoom);

	var g = svg.append("g")

	d3.csv("csvData/2010TW_utf8.csv", function(csvData){			
		
		// Creat csv data Array 
		var csvMatrix = [];

		for(var i=0; i<csvData.length; i++)
		{
			csvMatrix.push(csvData[i]["P_DEN"]);
		}
		
		// set color domain property
		color.domain([	
			d3.quantile(csvMatrix, 0),
			d3.quantile(csvMatrix, 0.25),
			d3.quantile(csvMatrix, 0.5),
			d3.quantile(csvMatrix, 0.75),
			d3.quantile(csvMatrix, 1)
		]);

		// Load geoJSON and join csv data
		d3.json("jsonData/taiwan.topo.json", function(json){				
			
			// parse topoJSON					
			var layer = topojson.feature(json, json.objects["taiwan"]);			
			
			// Iterater each csv data to join into json data
			for(var i=0; i<csvData.length; i++)
			{
				// From csv data get County Name
				var csvCounty = csvData[i]["COUNTY"]
				
				// From csv data get Value
				var csvValue = parseFloat(csvData[i]["P_DEN"]);

				// Join csv data and json data by County Name
				for(j=0; j<layer.features.length; j++)
				{
					// From layer get County Name
					var layerCounty = layer.features[j].properties.COUNTYNAME;

					if(csvCounty == layerCounty){

						// Copy csv data into json
						layer.features[j].properties.value = csvValue;
						break;
					}
				}
			}

			// draw layer
			g.selectAll("path")
				.data(layer.features)
				.enter()
				.append("path") 
				.attr("d", path)
				.style("stroke", "white")
				.style("fill", function(District){
					
					var value = District.properties.value

					if(value){
						
						return color(value);
					
					}else{
						
						//行政區沒有數值，使用灰色表示 
						return "#ccc";
					}

				});

			// zoom in
            d3.select(window).on('resize', function() {
                    projection
                        .scale(width/2/Math.PI)
                        .translate([width/2, height/2]);
 
                    g.selectAll("path")
                        .attr("d", path);
                });			

		})// End of load json data Callback function

		// add legend by using <sapn>
		var legend = d3.select("#legend")					  				  	
					   .append("ul")
					   .attr("class", "list-inline");
		
		var keys = legend.selectAll('li.key')
					    .data(color.range())
					    .enter()
					  .append('li')
					    .attr('class', 'key')
					    .style('border-top-color', String)
					    .text(function(d) {
					        var r = color.invertExtent(d);
					        var formatNumber = d3.format(".0f");
					        return formatNumber(r[0]);
					    });
					    

	})// End of load csv data Callback function
	
}// End of drawMap()
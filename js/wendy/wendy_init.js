$(function(){	
	// Define local variable and wendy library module
	var csv = wendy.csv,
		topo= wendy.topo;
		
	var opts,
		pop  ={},
		epa  ={},
		cwb  ={},
		user ={};
	
	/** Initialize Leaflet Map **/
	var map = new L.map('map').setView([23.978567, 120.9579531], 7)
					.addLayer(new L.tileLayer('http://{s}.tiles.mapbox.com/v3/verzonzoon.jdpd6545/{z}/{x}/{y}.png', { 
						attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>', 
						maxZoom: 18}));	

	/** Initialize all element **/
	$("#ListLayer").addClass("red").removeClass("black");

	$("#Panels>div").each(function (){
		if($(this).attr("id") === "ListLayerPanel"){			
			$(this).show();
		}else{
			$(this).hide();
		}
	});
		
	$("#progressBar").hide();

	/***** Tool Menu button *****/	
	// set generic event
	$("#ToolMenu .button").click(
		function(){
		// change style
		$("#ToolMenu .button").addClass("black").removeClass("red");
		$(this).addClass("red").removeClass("black");
		
		// hide all panel
		$("#Panels > div").slideUp();
		$("#" + this.id + "Panel").slideDown();
	});		
	
	/***** Panels *****/	
	// Layer List Panel Resize
	$(".LayerHeader").mouseover(function(){
		$(this).css("cursor", "pointer");
	});

	$(".LayerHeader").toggle(
		function (){
			$(this).next().slideUp();
		},
		function (){
			$(this).next().slideDown();
		}
	);

	/***** WendyPanel *****/
	// wendy Layer Options
	$("div.item").toggle(
		function(){
			$(this).css("background-color", "gray")
					.css("color", "white");
		},
		function(){
			$(this).css("background-color", "white")
					.css("color", "gray");
		}
	);
	
	$("#popIndex, #eduStatics").toggle(		
		// toggle on: show table fields		
		function (){			
			if($("#" + this.id + "+ .list")[0] !== undefined){				
				// table option is already exist
				$("#" + this.id + "+ .list").slideDown();			
			
			}else{				
				// insert fields container node after selected nodes
				$(this).after('<div class="ui fluid selection list"></div>');

				// show population index fields
				var parentNode = "#" + this.id + " + .list";
				var url = wendy.csv.getChoroplethUrl(this.id);				
				
				d3.csv(url, function (table){				    
				    var header = Object.keys(table[0]);				    
					for(var i=0, max=header.length; i<max; i+=1){
						if (header[i]!=="COUNTYNAME"){						
							// show field options
							d3.select(parentNode).append("div")							 
						  	  .attr("class", "item")
						  	  .attr("name", header[i])
						  	  .text(header[i]);					  	

						  	// bind plot map event for each option
						  	$(parentNode + " div[name='" + header[i] + "']").on("click",function (){
		  						// set all wendy options off
		  						$("#popIndex + .list  div.item")
		  							.css("background-color", "white")
									.css("color", "gray");

		  						$("#eduStatics + .list  div.item")
		  							.css("background-color", "white")
									.css("color", "gray");

		  						// set toggle on style
		  						$(this).css("background-color", "gray")
										.css("color", "white");
				  			
					  			// load twCounty topo and plot map
					  			var fieldName = $(this).attr("name");
					  			d3.json(topo.getTopoUrl("twCounty_after2010"), function(json){
					  				var twCounty = topo.parse(json);
					  				var twCounty = topo.joinCsv({
										csv        : table,
										topo       : twCounty,
										joinField  : "COUNTYNAME",
										joinSingle : true,
										outputField: fieldName,
										filter     : false
					  				});							  				
					  				wendy.graph.plotChoropleth(map, twCounty, fieldName);
					  			});
						  	});

						}// end of add options
					}// end of for loop  
				
				});// end of d3.csv load
			}
		},

		// toggle off
		function (){
			$("#"+ this.id + "+.list").slideUp();
		}
	);	

	$("#pm25").toggle(
		// toggle on
		function (){
			// set progress bar
			$("#progressBar").show();
			$("#progressBar div.bar").attr("style", "width:10%");
			
			d3.csv("Data/csv/epa/EPA_AirStation.csv", function (airSite){				
				
				// set progress bar
				$("#progressBar div.bar").attr("style", "width:30%").text("環保署資料下載中...");

				// air quality data url
				var aqxUrl="http://opendata.epa.gov.tw/ws/Data/AQX/?$orderby=SiteName&$skip=0&$top=1000&format=json";						
				d3.json(wendy.getCloudUrl(aqxUrl), function (aqx){						
					
					// set progress bar
					$("#progressBar div.bar").attr("style", "width:45%").text("");

					d3.json("Data/json/twGrid.topo.json", function (twGrid){
						// set progress bar
						$("#progressBar div.bar").attr("style", "width:50%");
						
						// parse twGrid topojson
						var twGrid = topo.parse(twGrid);
					
						// join wendy csv and user csv by siteName
						var aqxCsv = csv.csvJoinCsv(airSite, aqx);
						
						// set progress bar
						$("#progressBar div.bar").attr("style", "width:60%");
						
						// Define kriging variable
						var t = [],
							x = [],
							y = [],
							model = "exponential",
							sigma2 = 0,
							alpha = 100,
							variogram;

						// Extract kriging variable from aqx csv file
						for(var i=0, max=aqxCsv.length; i<max; i+=1){
							var lng = aqxCsv[i]["Lng"],
								lat = aqxCsv[i]["Lat"],
								value = aqxCsv[i]["PM2.5"];
							x.push(lng);
							y.push(lat);
							t.push(value);
						}

						// kriging training predicted function
						variogram = kriging.train(t, x, y, model, sigma2, alpha);					
						
						// set progress bar
						$("#progressBar div.bar").attr("style", "width:70%");
						
						// add kriging predicted value into twGrid
						for(var i=0, max=twGrid.length; i<max; i+=1){
							var newX = twGrid[i]["properties"]["Lng"],
								newY = twGrid[i]["properties"]["Lat"];
							
							twGrid[i]["properties"]["PM2.5"] 
								= kriging.predict(newX, newY, variogram);
						}						
						
						// set progress bar
						$("#progressBar div.bar").attr("style", "width:80%");
						
						// plot interpolation graph
						wendy.topo.plotOnLeaflet(map, twGrid, "PM2.5");

						// set progress bar
						$("#progressBar div.bar").attr("style", "width:100%");
						$("#progressBar").fadeOut();

					}); // End of twGrid topo json
				}); // End of loading pm2.5 csv from epa open data
			}); // End of loading air station csv


		},
		
		// toggle off
		function (){
			wendy.graph.removeAll();
			console.log("remove!");
		}
	);

	$("#temperature").toggle(
		// toggle on
		function (){
			// data source: http://opendata.cwb.gov.tw/about.htm
			var url = wendy.getCloudUrl("http://opendata.cwb.gov.tw/opendata/DIV2/O-A0001-001.xml");
			d3.xml(url, "application/xml", function (xml){				
				// parse xml to json format object
				var xmlDoc = $.xml2json(xml);


				console.log(xmlDoc);
			});
		},

		// toggle off
		function (){

		}
	);					
	
});
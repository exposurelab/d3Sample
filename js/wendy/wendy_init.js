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
	
	$("#pm25").toggle(
		// toggle on
		function (){
			
			d3.csv("Data/csv/epa/EPA_AirStation.csv", function (airSite){
				console.log("airstation loading");
				// air quality data url
				var aqxUrl="http://opendata.epa.gov.tw/ws/Data/AQX/?$orderby=SiteName&$skip=0&$top=1000&format=json";
				
				d3.json(wendy.getCloudUrl(aqxUrl), function (aqx){					
					console.log("aqxUrl loading");
					
					d3.json("Data/json/twGrid.topo.json", function (twGrid){
						console.log("twGrid loading");
						// parse twGrid topojson
						var twGrid = topo.parse(twGrid);
						console.log("csvjoin start");
						// join wendy csv and user csv by siteName
						var aqxCsv = csv.csvJoinCsv(airSite, aqx);
						console.log("csvjoin end");
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
						console.log("Kriging start calculate");
						// add kriging predicted value into twGrid
						for(var i=0, max=twGrid.length; i<max; i+=1){
							var newX = twGrid[i]["properties"]["Lng"],
								newY = twGrid[i]["properties"]["Lat"];
							
							twGrid[i]["properties"]["PM2.5"] 
								= kriging.predict(newX, newY, variogram);
						}
						console.log("Kriging OK");
						wendy.topo.plotOnLeaflet(map, twGrid, "PM2.5");

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
	
});
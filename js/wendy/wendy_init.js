$(function(){	
	// Define local variable and wendy library module
	var csv = wendy.csv,
		topo= wendy.topo;
		
	// Define button selected flag
	var csvFlag = 0,
		tsvFlag = 0;

	/** Initialize Leaflet Map **/
	var map = new L.map('map').setView([23.978567, 120.9579531], 7)
					.addLayer(new L.tileLayer('http://{s}.tiles.mapbox.com/v3/verzonzoon.jdpd6545/{z}/{x}/{y}.png', { 
						attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a>', 
						maxZoom: 18}));	

	/** Initialize all element **/
	// ListLayer Button active state
	$("#ListLayer").addClass("red").removeClass("black");

	// left-side panels
	$("#Panels>div").hide();
	$("#ListLayerPanel").show();

	// right-side panels
	$(".col-md-9").hide();
	$("#map").show();
	
	// hide progressBar 
	$("#progressBar").hide();

	/***** Tool Menu button *****/	
	// set Buttons and Panels event
	$("#ToolMenu .button").click(function(){
		// change style
		$("#ToolMenu .button").addClass("black").removeClass("red");
		$(this).addClass("red").removeClass("black");
		
		// show the relative "left" panels
		$("#Panels > div").slideUp();
		$("#" + this.id + "Panel").slideDown();

		// show the relative "right" panels
		$(".col-md-9").hide();		
		switch(this.id){
			case "ListLayer":
				$("#map").show();
				break;
			case "AddTable":
				$("#tableList").show();
				break;
			case "AddTopo":
				$("#vectorList").show();
				break;
			case "Choropleth":
				$("#ChoroplethOptions").show();
				break;
			case "Interpolation":
				$("#InterpolationOptions").show();
				break;
			case "Analysis":
				$("#AnalysisOptions").show();
				break;
			default:
				$("#map").show();
		}
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
	$("#WendyPanel div.item").toggle(
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
			wendy.graph.removeAll();
			console.log("remove!");
		}
	);

	/***** UserPanel *****/

	/***** AddTablePanel *****/
	$("#csvSelect").on("click", function (e){
		e.preventDefault(); // prevent navigation to "#"
		$("#csvFiles")[0].click();

		// set button group css style
		$("#csvSelect")
		.css("color", "white")
		.css("background-color", "gray");

		$("#tsvSelect")
		.css("color", "gray")
		.css("background-color", "white");

		// set csvFlag and tsvFlag
		csvFlag = 1;
		tsvFlag = 0;
	});

	$("#tsvSelect").on("click", function (e){
		e.preventDefault(); // prevent navigation to "#"
		$("#tsvFiles")[0].click();

		// set button group css style
		$("#csvSelect")
		.css("color", "gray")
		.css("background-color", "white");

		$("#tsvSelect")
		.css("color", "white")
		.css("background-color", "gray");

		// set csvFlag and tsvFlag
		csvFlag = 0;
		tsvFlag = 1;
	});


	$("#tableParse").on("click", function (e){
	 	// prevent navigation to "#"
		e.preventDefault();

		// csv selected
		if(csvFlag){
			var tableFiles = $("#csvFiles")[0].files;			
			
			// check user already select csv files
			if(tableFiles.length === 0){
				alert("請選擇逗點分隔(.csv)檔案，\n"+
					  "可以一次選取多個檔案喔!");
				return 0;
			}
		}

		// tsv selected
		if(tsvFlag){
			var tableFiles = $("#tsvFiles")[0].files;

			// check user already select csv files
			if(tableFiles.length === 0){
				alert("請選擇空白分隔(.txt)檔案，\n"+
					  "可以一次選取多個檔案喔!");
				return 0;
			}
		}

		// parse csv files
		for(var i=0, max=tableFiles.length; i<max; i++){
			// run FileReader onload ajax event by using immediate function 
			(function (tableFile){					
		  		// indentify file type
	  			var fileName = tableFile.name.split('.')[0];
	  			var fileExt  = tableFile.name.split('.').pop();
				var reader = new FileReader();										
				reader.readAsText(tableFile, "UTF-8");
				console.log(fileExt);
				reader.onload = function(e){
		  			var tableContent = e.target.result;
		  			
		  			if(fileExt === "csv"){
		  				var table = wendy.csv.parse(tableContent);			
		  			}else if(fileExt === "txt"){
		  				var table = wendy.tsv.parse(tableContent);
		  			}else{
		  				alert("您所選的檔案格式，本系統目前不支援!");
		  				return 0;
		  			}

		  			var columnHeader = Object.keys(table[0]);			  			
		  			
		  			d3.select('#tableList')
	  				  .select(".FileContent")
	  				  .append("h2")
	  				  .attr("class", "ui header")
	  				  .attr("name", fileName)
	  				  .html('<i class="table icon"></i>' + fileName)
	  				  .node();

	  				// table Name header event 
		  			$("#tableList .FileContent h2")
			  			.mouseover(function (){
			  				$(this).css("cursor", "pointer");
			  			})			  			
			  			.toggle(
		  					function (){
		  						$(this).next("table").fadeOut();
		  					},			  					
		  					function (){
		  						$(this).next("table").slideDown();
		  					}
			  			);

		  			/// Create table Contains csv content			  			
		  			//  (1)Create table framework
		  			var tableSelector = d3.select("#tableList")
		  								  .select(".FileContent")			  				
		  								  .append("table")
		  				                  .attr("class", "ui table segment")
		  				                  .attr("tableName", fileName);		  			
					
					//  (2)Create table header
		  			var tableHeader = tableSelector.append("thead").append("tr");
		  			
		  			for(var col=0, maxCol=columnHeader.length; col<maxCol; col+=1){			  				
		  					var fieldName = columnHeader[col];			  					
		  					tableHeader.append("th")
		  							   .text(fieldName);
		  			}
		  			
		  			//  (3)Create table Content
		  			var tableBody = tableSelector.append("tbody");

		  			for(var row=0, maxRow=table.length; row<maxRow; row+=1){
						var tableBodyContent = tableBody.append("tr");

						if(row%2 === 1){
							tableBodyContent.style("background-color", "#EDEDED");
						}

		  				for(var col=0, maxCol=columnHeader.length; col<maxCol; col+=1){
		  					var fieldName = columnHeader[col];
		  					tableBodyContent.append("td").text(table[row][fieldName]);
		  				}
		  			}

				}// End of reader.onload			
			
			})(tableFiles[i]);		
		
		}// End of for loop
	});//End of "#tableParse" click

	/***** AddTopoPanel *****/
	/// dropbox
	$("#vector_dropbox").on("dragenter", function (e){
		e.stopPropagation();
		e.preventDefault();
	});
	
	$("#vector_dropbox").on("dragover", function (e){
		e.stopPropagation();
		e.preventDefault();	
	});
	
	$("#vector_dropbox").on("drop", function (e){
		e.stopPropagation();
  		e.preventDefault();
  		$(this).css("backgroundColor", "gray").text("完成選取");

  		// file reader
  		var data = e.originalEvent.dataTransfer;
  		var files = data.files;  		
  		
  		for(var i=0, max=files.length; i<max; i+=1){
  			(function (file){		  		
		  		// indentify file type
		  		var fileName = file.name.split('.')[0],
		  			fileExt  = file.name.split('.').pop(); //副檔名
		  		
		  		// read selected files content
		  		var reader = new FileReader();
		  		reader.readAsText(file);

		  		// // after read file content....
		  		reader.onload = function (e) {	
		  			// identify file format and convert to object
		  			var content = reader.result;
		  			switch(fileExt){
		  				case("topojson"):
				  			var topo = wendy.topo.parse(content);
				  			console.log(topo);
				  			break;
				  		
				  		case("geojson"):				  			
				  			var topo = JSON.parse(content);				  			
				  			console.log(topo);
				  			break;
				  		
				  		case("kml"):
				  			var kmlObj = $.parseXML(content);
				  			var topo = toGeoJSON.kml(kmlObj)["features"];
				  			console.log(topo);
			  				break;

			  			case("gpx"):
			  				var gpxObj = $.parseXML(content);
			  				var topo = toGeoJSON.gpx(gpxObj);
			  				console.log(topo);
			  				break;

			  			default:
			  				alert('請確認您的"檔案格式"或"副檔名"符合以下所列的任一項:' + 
			  					  '(1) .topojson\n' +
			  					  '(2) .geojson\n' +
			  					  '(3) .kml\n' +
			  					  '(4) .gpx'
			  					 );
			  				return 0;
			  		}		
		  			
		  			d3.select("#vectorList")			  				
		  				.append("p")
		  				.text(fileName + '.' + fileExt +" 載入完成!");

		  		}  	

  			}(files[i]));
		}
	
	});// end of drop file into box
});
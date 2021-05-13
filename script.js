var clientId = "570aa2a055984ac2a9eaef39442423c8";
var redirectUri = "http://localhost:5500"
var token, error;

if (token == undefined && (location.hash != "" || location.search != "")) {
    if (location.hash.includes("access_token")) {
        token = location.hash.split('&')[0].split("=")[1];
    }
    else if (location.search.includes("error")) {
        console.error("Error: " + location.search.split("=")[1]);
    }
    // Removes hash/query from URL and history
    history.replaceState(null, null, redirectUri);
}

window.onload = function() {
    document.getElementById("login").addEventListener("click", () => {
        window.location = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirectUri}&scope=playlist-modify-private`;
    });

    if (token != undefined) {
        const Http = new XMLHttpRequest();

        document.getElementById("login").innerHTML = "Logged in!";
        document.getElementById("login").disabled = true;
        document.getElementById("option-input").disabled = false;
        document.getElementById("generate-button").disabled = false;

        let searchBox = document.getElementById("option-input");
        let searchResults = document.getElementById("search-list");
        let seedList = document.getElementById("seed-list");
        let genButton = document.getElementById("generate-button");

        let lastQuery = 0;
        searchBox.addEventListener("input", () => {
            // Limits search update to 5 times a second
            for (let curTime = Date.now(); curTime - lastQuery > 200; lastQuery = curTime) {
                searchResults.innerHTML = "";
                if (searchBox.value != "") {
                    let query = searchBox.value.replace(" ", "+");
                    Http.open("GET", `https://api.spotify.com/v1/search?q=${query}&type=track&limit=5`);
                    Http.setRequestHeader("Accept", "application/json");
                    Http.setRequestHeader("Content-Type", "application/json");
                    Http.setRequestHeader("Authorization",  `Bearer ${token}`);
                    Http.send();

                    Http.onreadystatechange = function() {
                        if (this.readyState == 4 && this.status == 200) {
                            let search = JSON.parse(Http.responseText);
                            search.tracks.items.forEach((track) => {
                                let node = document.createElement("LI");
                                node.innerHTML = track.artists[0].name + " - " + track.name;
                                node.className = "list-group-item";
                                node.id = track.id;

                                searchResults.appendChild(node).addEventListener("click", (e) => {
                                    // Constructs an array from id:s of elements in seed list, checks if target id is included
                                    if (!Array.from(seedList.children).map(seed => seed.id).includes(e.target.id) && !(Array.from(seedList.children).length >= 5)) {
                                        seedList.appendChild(e.target).addEventListener("click", (e) => {
                                            e.target.remove();
                                        });;
                                    }
                                });
                            });
                        }
                    };
                }
            }
        });

        genButton.addEventListener("click", () => {
            var seeds = Array.from(document.getElementById("seed-list").children).map(seed => seed.id).join();
            if (seeds.length != 0) {
                Http.open("GET", `https://api.spotify.com/v1/recommendations?limit=20&seed_tracks=${seeds}`);
                Http.setRequestHeader("Accept", "application/json");
                Http.setRequestHeader("Content-Type", "application/json");
                Http.setRequestHeader("Authorization",  `Bearer ${token}`);
                Http.send();

                Http.onreadystatechange = function() {
                    if (this.readyState == 4 && this.status == 200) {
                        let recommendations = JSON.parse(Http.responseText).tracks.map(track => track.uri).join();

                        Http.open("GET", "https://api.spotify.com/v1/me");
                        Http.setRequestHeader("Accept", "application/json");
                        Http.setRequestHeader("Content-Type", "application/json");
                        Http.setRequestHeader("Authorization",  `Bearer ${token}`);
                        Http.send();

                        Http.onreadystatechange = function() {
                            if (this.readyState == 4 && this.status == 200) {
                                let userId = JSON.parse(Http.responseText).id;
                                let body = "{\"name\":\"Recommended tracks\",\"description\":\"Playlist created based on your choice of tracks!\",\"public\":false}";

                                Http.open("POST", `https://api.spotify.com/v1/users/${userId}/playlists`); 
                                Http.setRequestHeader("Content-Type", "application/json");
                                Http.setRequestHeader("Authorization",  `Bearer ${token}`);
                                Http.send(body);

                                Http.onreadystatechange = function() {
                                    if (this.readyState == 4 && (this.status == 200 || this.status == 201)) {
                                        let playlistId = JSON.parse(Http.responseText).id;

                                        Http.open("POST", `https://api.spotify.com/v1/playlists/${playlistId}/tracks?uris=${recommendations}`);
                                        Http.setRequestHeader("Content-Type", "application/json");
                                        Http.setRequestHeader("Authorization",  `Bearer ${token}`);
                                        Http.send();

                                        Http.onreadystatechange = function () {
                                            if (this.readyState == 4 && this.status == 201) {
                                                let node = document.createElement("IFRAME");
                                                node.setAttribute("src", `https://open.spotify.com/embed/playlist/${playlistId}`);
                                                node.setAttribute("width", document.querySelector("HTML").clientWidth * 0.8 - 40);
                                                node.setAttribute("height", "380px");

                                                let tempNode = document.createElement("SECTION");
                                                tempNode.appendChild(node);
                                                document.querySelector("MAIN").appendChild(tempNode);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    };
}
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new bootstrap.Tooltip(tooltipTriggerEl)
})
/*---------------------------------------------------------------------------------------------------------*/
let showsHeaderContainer = document.querySelector(".header-container .shows");
let showsList = document.querySelector(".show-list-container .show-list");
const searchValue = document.querySelector("#search-input");
const searchBTN = document.querySelector("#search");
let messages = document.querySelector(".messages");


const LoadShowsData = async () => {
  //const TVMAZE_EPISODES_ENDP = "https://api.tvmaze.com/shows/2/episodes";
  const TVMAZE_SHOWS = "https://api.tvmaze.com/shows";

  try
  {
      const res = await fetch(TVMAZE_SHOWS);
      const showsData = await res.json();
      DisplayShowsData(showsData);
  }
  catch(err)
  {
      console.error(err);

      DisplayError(err);
  }
}
LoadShowsData();


const DisplayShowsData = (shows) => {
 if(shows.length > 0)
 {
    let popularShows = shows.filter(s => s.rating != null && s.rating.average > 8);
    let randomShows = popularShows.sort(() => Math.random() - Math.random()).slice(0, 7);
    let placeHolderVal = shows.sort(() => Math.random() - Math.random()).slice(0, 1);
    
    searchValue.placeholder = placeHolderVal[0].name; 

    randomShows.map((i) => {
      //console.log(i);
      
      let originalImage = i.image.original;
      let summary = i.summary;
      //let trimmedSummary = summary.substr(0, 50);
      let showName = i.name;
      let trimmedShowName = showName.substr(0, 10) + "...";
      let rating = i.rating.average;
      let showId = i.id;
      let showNameClass = showName.replace(/\s/g, "-")
                                  .replace(":", "")
                                  .replace("'", "")
                                  .replace(/\./g, "")
                                  .replace(/[0-9]/g, "N")
                                  .replace("!", "")
                                  .replace("&", "and");                                       

      //Get rating percentage
      const starsTotal = 10;
      const starsPercentage = (rating / starsTotal) * 100;

      //Round percentage
      const starsRounded = Math.round(starsPercentage / 5) * 5;
      
      showsHeaderContainer.innerHTML += `   
            <div class="card show-d-${showId}" style="width: 18rem;">
              <a href="#">
                  <img src="${originalImage}" class="card-img-top" alt="...">
                  <div class="card-body d-flex justify-content-between">
                    <b>${(showName.length < 14) ? showName : trimmedShowName}</b>
                    <b class="stars-outer">
                        <b class="${showNameClass} stars-inner"></b>
                    </b>
                  </div>
              </a>  
            </div>         
      `;
      
      document.querySelector(`.${showNameClass}.stars-inner`).style.width = starsRounded + "%";     
    });//END SHOWS LOOP

    //From Slider
    randomShows.map((v) => {
      document.querySelector(".show-d-" + v.id).addEventListener("click", (e) => {
        e.preventDefault();
        //console.log(v.id);
        GetSingleShowDetails(v.id);
      });
    });
 }
 else
 {

 }
}
 
searchBTN.addEventListener('click', (e) => {
    e.preventDefault();
    
    if(searchValue.value.length > 0 && searchValue.value != "")
    {
         SearchShow(searchValue.value);
    }
    else
    {
      messages.innerHTML = `
          <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
          <div id="liveToast" class="toast hide toast-warning" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
            <span class="toast-warning-icon"><i class="bi bi-exclamation-triangle-fill"></i></span>
              <strong class="me-auto toast-title">Warning</strong>
              <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
              <i class="bi bi-arrow-return-right"></i> Please enter movie name
            </div>
          </div>
        </div>
      `;

      RunToast();
    }
   
});

const SearchShow = async (query) => {
    let searchOption = Array.from(document.getElementsByName("search-options")).find(r => r.checked).value;
    let TVMAZE_SEARCH_SHOW = "";

    if(searchOption === "single")
    {
      TVMAZE_SEARCH_SHOW = `https://api.tvmaze.com/singlesearch/shows?q=${query}`
    }
    else
    {
      TVMAZE_SEARCH_SHOW = `https://api.tvmaze.com/search/shows?q=${query}`;
    }

    try
    {
        const res = await fetch(TVMAZE_SEARCH_SHOW);
        let showData = await res.json();

        if(searchOption === "single" && showData != null)
        {
          let singleData = [];
          singleData.push({"show" : showData});

          showData = singleData;      
        }

        DisplayShowsFromSearch(showData);       
    }
    catch(err)
    {
        console.error(err);

        DisplayError(err);
    }
}

DisplayShowsFromSearch = (showData) => {
    let clearBTN = document.querySelector("#clear-search");

    if(showData != null && showData.length > 0)
    {
        showsList.innerHTML = "";

        showData.map((s) => {

            let showImage = "";
            let showName = s.show.name;
            let trimmedShowName = showName.substr(0, 17) + "...";
            let trimmedSummary = (s.show.summary != null) ? (s.show.summary.substr(0, 55) + "...") : "";

            if(s.show.image != null)
            {
                showImage = s.show.image.original;
            }
            else
            {
                showImage = "/img/no-img-available.png";
            }
           
            showsList.innerHTML += `
                <div class="col-md-3">
                  <div class="card show-d-${s.show.id} card-show-list">
                    <a href="#">
                        <img src="${showImage}" style="height:300px" class="card-img-top" alt="${showName} Image">
                        <div class="card-body">
                          <h5 class="card-title">${(showName.length < 14) ? showName : trimmedShowName}</h5>
                         
                          ${trimmedSummary.length > 0 ? `<hr/>${trimmedSummary}` : ""}
                        </div>
                    </a>                 
                  </div>
                </div>
            `;
            
            //Show Clear button
            clearBTN.classList.remove("hidden");

            clearBTN.addEventListener('click', (e) => {
              e.preventDefault();

              showsList.innerHTML = "";
              searchValue.value = "";
              clearBTN.classList.add("hidden");
            });
        });

        showData.map((v) => {
          document.querySelector(".show-d-" + v.show.id).addEventListener("click", (e) => {
            e.preventDefault();
            //console.log(v.show.id);
            GetSingleShowDetails(v.show.id);
          });
        });
    }
    else
    {
      showsList.innerHTML = "";

      messages.innerHTML = `
          <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
          <div id="liveToast" class="toast hide" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
            <span class="toast-warning-icon"><i class="bi bi-exclamation-triangle-fill"></i></span>
              <strong class="me-auto toast-title">Warning</strong>
              <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
              No results found for <b>${searchValue.value}</b>
            </div>
          </div>
        </div>
      `;

      RunToast();
    }
}


const DisplayShowDetailsModal = (data) => {
    let showDetailsModal = document.querySelector(".modal-details");
    let showImage = (data.image != null) ? data.image.original : null;
    let genres = data.genres;
    let status = "";
    let schedule = data.schedule;
    let country = (data.network != null) ? data.network.country.name : null;
    let countryCode = (data.network != null) ? data.network.country.code : null;

    if(showImage == null)
    {
      showImage = "/img/no-img-available.png";
    }

    if(data.status == "Running")
    {
      status = `<span class="badge bg-success">${data.status}</span>`;
    }
    else if(data.status == "To Be Determined")
    {
      status = `<span class="badge bg-warning text-dark">${data.status}</span>`;
    }
    else
    {
      status = `<span class="badge bg-danger">${data.status}</span>`;
    }

    showDetailsModal.innerHTML = `      
    <!-- Modal -->
    <div class="modal fade" id="detail" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-dark text-white">
            <h5 class="modal-title" id="exampleModalLabel">${data.name}</h5>
            <button type="button" class="btn-close btn-close-modal" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
              <div class="row">
                  <div class="col-md-5 bg-dark text-white p-3">
                    <div class="card" >
                      <img src="${showImage}" class="card-img-top" alt="${data.name} Image">                    
                    </div>
                    <div class="genres mt-3">                    
                    </div>
                  </div>
                  <div class="col-md-7 modal-show-info bg-dark text-white p-3">
                      <b>Status:</b> ${(data.status != null) ? status : "No Status Available"}
                      <hr/>
                      <b>Language:</b> ${(data.language != null) ? data.language : "No Language Available"}
                      <hr/>
                      <b>Premiered:</b> ${(data.premiered != null) ? data.premiered : "No Date Available"}
                      <hr/>
                      <b>Rating:</b> ${(data.rating.average != null) ? data.rating.average : "No Rating Available"}
                      <hr/>
                      <b>Runtime:</b> ${(data.runtime != null) ? data.runtime + " min" : "No Runtime Available"}

                      ${(country != null) ? `<hr/><b>Country:</b> <img src="http://www.geognos.com/api/en/countries/flag/${countryCode}.png" style="width:30px;"/> ${country}` : ""}
                      ${(data.officialSite != null) ? `<hr/><b>Official Site:</b> <a href="${data.officialSite}" target="_blank"><i class="bi bi-arrow-up-right-square-fill"></i><a/>` : ""}
                  </div>
                  <div class="col-md-12 mt-3 schedule-accordion">
                      <div class="show-list">
                          <div class="accordion accordion-flush" id="accordionShowDetails">
                            <div class="accordion-item">
                              <h2 class="accordion-header" id="flush-headingOne">
                                <button class="accordion-button collapsed bg-dark text-white" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne" aria-expanded="false" aria-controls="flush-collapseOne">
                                   <b>Schedule</b>
                                </button>
                              </h2>
                              <div id="flush-collapseOne" class="accordion-collapse collapse" aria-labelledby="flush-headingOne" data-bs-parent="#accordionShowDetails">
                                <div class="accordion-body">
                                    <table class="table">
                                        <thead>
                                          <tr>
                                            <th scope="col">Days</th>
                                            <th scope="col">Time</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                         
                                        </tbody>
                                    </table>
                                </div>
                              </div>
                            </div>                                             
                          </div>
                      </div>
                  </div>
                  <div class="col-md-12 mt-3">
                      ${
                        data.summary != null ? `<div class="p-3 mb-2 bg-dark text-white">${data.summary}</div>` : ""
                      }
                  </div>
                  <div class="col-md-12 mt-3 bg-dark text-white">
                      <h3 class="pt-2 px-3 modal-shows-images-h">Images <span></span></h3>
                      <hr/>
                      <div class="modal-shows-images p-4 pt-1">
                      </div>
                  </div>
              </div>            
          </div>
          <div class="modal-footer bg-dark text-white">
            <button type="button" class="btn btn-light" id="add-to-favorite" value="add"><i class="bi bi-heart" style="color:red;"></i></button>
          </div>
        </div>
      </div>
    </div>
    `;
    ExistInFavoriteList(data.id);
    ShowImagesCarousel(data.id);
                      
    let showGenres = document.querySelector(".modal-details .genres");
    let showSchedule = document.querySelector(".modal-details .table tbody");
    let scheduleAccordion = document.querySelector(".schedule-accordion");

    const addToFavoriteBTN = document.querySelector("#add-to-favorite");

    document.querySelector(".modal .modal-content").style.backgroundImage = `url(${showImage})`;
    document.querySelector(".modal .btn-close").style.backgroundColor = "red";

    genres.map((g) => {showGenres.innerHTML += `<span class="badge rounded-pill bg-info text-dark">${g}</span>`;});
    
    if(schedule.days.length > 0)
    {
      schedule.days.map((d) => {
        showSchedule.innerHTML += `
          <tr>
              <td>${(schedule.days.length > 0) ? d : "No Day Available"}</td>
              <td>${(schedule.time != "") ? schedule.time : "No Time Available"}</td>
          </tr>
        `;     
      });
    }
    else
    {
      scheduleAccordion.parentNode.removeChild(scheduleAccordion);
    }
   
    addToFavoriteBTN.addEventListener("click", (e) => {
      //e.preventDefault();

      let existingLocalS = localStorage.getItem("fav");

      if(addToFavoriteBTN.value === "add")
      {
       
        let favorite = [{"id" : data.id, "name" : data.name, "image" : data.image}];
      
        if(existingLocalS == null)
        {
          localStorage.setItem("fav", JSON.stringify(favorite));
        }
        else
        {
          favorite = {"id" : data.id, "name" : data.name, "image" : data.image};
          existingLocalS = existingLocalS ? JSON.parse(existingLocalS) : {};
  
          existingLocalS.push(favorite);
  
          const ids = existingLocalS.map(o => o.id);
          const unique = existingLocalS.filter(({id}, index) => !ids.includes(id, index + 1));
  
          localStorage.setItem("fav", JSON.stringify(unique));      
        }
        
        ExistInFavoriteList(data.id, addToFavoriteBTN.value, data.name);
      }
      else if(addToFavoriteBTN.value === "remove")
      {
        RemoveFromFavoriteList(data.id);
      }
   
    });
    
    new bootstrap.Modal(document.querySelector("#detail"), {focus: false}).show();
}

const RemoveFromFavoriteList = (id) => {
  let existingLocalS = localStorage.getItem("fav");
  let favList = JSON.parse(existingLocalS);

  if(favList.length > 0)
  {
    for(let i = 0; i < favList.length; i++)
    {    
      if (favList[i].id === id) { 

          favList.splice(i, 1); 
      }   
    }
    localStorage.setItem("fav", JSON.stringify(favList));
    ExistInFavoriteList(id, "remove");  
  }
}

const ExistInFavoriteList = (showID, action, showName) => {
  let existingLocalS = localStorage.getItem("fav");
 
  if(existingLocalS != null)
  {
    let favoriteList = JSON.parse(existingLocalS);
    let ids = favoriteList.map(i => i.id);

    if(ids.includes(showID))
    {
      document.querySelector("#add-to-favorite").value = "remove";
      document.querySelector("#add-to-favorite").innerHTML = '<i class="bi bi-heart-fill" style="color:red;"></i>';

      if(action === "add")
      {
        messages.innerHTML = `
          <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
            <div id="liveToast" class="toast hide toast-success" role="alert" aria-live="assertive" aria-atomic="true">
              <div class="toast-header">
              <span class="toast-success-icon" style="margin-right:5px;"><i class="bi bi-check-circle-fill"></i></span>
                <strong class="me-auto toast-title"> Success</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
              </div>
              <div class="toast-body">
                <i class="bi bi-arrow-return-right"></i> <span><b>${showName}</b> added to your favorite list.<span/>
              </div>
            </div>
          </div>
        `;
        RunToast();
      }
    }
    else
    {
      let add = document.querySelector("#add-to-favorite");

      if(add != null)
      {
        document.querySelector("#add-to-favorite").value = "add";
        document.querySelector("#add-to-favorite").innerHTML = '<i class="bi bi-heart" style="color:red;"></i>';
      }      
    }
  }
  CheckFavoriteList();
}

const CheckFavoriteList = () => {
  let favorites = localStorage.getItem("fav");
  let notificationBTN = document.querySelector("#notification-btn");
  let notificationCount = document.querySelector(".notification-count");
  let offcanvasCard = document.querySelector(".offcanvas-card");

  if(favorites != null)
  {
    let favoriteList = JSON.parse(favorites);
    offcanvasCard.innerHTML = "";

    favoriteList.map((fd) => {
        let showImage = (fd.image != null) ? fd.image.original : null;

        if(showImage == null)
        {
          showImage = "/img/no-img-available.png";
        }

        offcanvasCard.innerHTML += `
        <div class="card">
          <div class="card-body bg-dark text-white d-flex justify-content-end">        
            <span class="remove-${fd.id}" style="color:red; cursor:pointer;"><i class="bi bi-x-circle"></i></span>
          </div>
            <a href="#" id="show-${fd.id}" style="text-decoration:none;">
              <img src="${showImage}" class="card-img-top" alt="${fd.name} Image">         
              <div class="card-body bg-dark text-white">
                <h5 class="card-title">${fd.name}</h5>
              </div>
            </a>               
        </div>
        <hr/>
        `;
    });
    
    favoriteList.map((i) => {
      document.querySelector("#show-" + i.id).addEventListener("click", (e) => {
        //e.preventDefault();
        GetSingleShowDetails(i.id);
      });

      document.querySelector(".remove-" + i.id).addEventListener("click", (e) => {
        RemoveFromFavoriteList(i.id);
      });
    });

    if(favoriteList.length > 0)
    {
      notificationBTN.classList.remove("hidden");
      notificationCount.innerText = favoriteList.length;
    }
    else
    {
      notificationBTN.classList.add("hidden");
    }
    
  }
  else
  {
    notificationBTN.classList.add("hidden");
    offcanvasCard.innerHTML = "";
  }
}
CheckFavoriteList();

const GetSingleShowDetails = async (id) => {
    const SHOW_MAIN_INFORMATIN = `https://api.tvmaze.com/shows/${id}`;
   
    try
    {
        const res = await fetch(SHOW_MAIN_INFORMATIN);
        const showsData = await res.json();
        
        DisplayShowDetailsModal(showsData);
    }
    catch(err)
    {
        console.error(err);

        DisplayError(err);
    }
}

//Show's Carousel Images
const ShowImagesCarousel = async (id) => {
  const SHOW_IMAGES = `https://api.tvmaze.com/shows/${id}/images`;

  try
  {
    const res = await fetch(SHOW_IMAGES);
    const showImagesData = await res.json();

    let showImagesContainer = document.querySelector(".modal-shows-images");

    if(showImagesData != null && showImagesData.length > 0)
    {
      let pos = 0;
      console.log(showImagesData);
      showImagesContainer.innerHTML = `
            <div id="carouselImagesIndicators" class="carousel slide" data-bs-ride="carousel">
              
                <div class="carousel-show-images carousel-inner">
                  
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#carouselImagesIndicators" data-bs-slide="prev">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#carouselImagesIndicators" data-bs-slide="next">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Next</span>
                </button>
            </div>
      `;

      let carouselInner = document.querySelector(".carousel-show-images");
      let imagesCount = document.querySelector(".modal-shows-images-h span");
      imagesCount.innerText = `(${showImagesData.length})`;

      showImagesData.map((i) => {
        let original = i.resolutions.original.url;
       
        carouselInner.innerHTML += `
            <div class="carousel-item ${(pos == 0) ? "active" : ""}">
                <img src="${original}" style="height:550px;" class="d-block w-100 img-thumbnail" alt="...">
            </div>
        `;
        pos++;
      });
    }
  }
  catch(err)
  {
    console.error(err);

    DisplayError(err);
  }
}

//Clear Favorite List
document.querySelector(".clear-fav-list").addEventListener("click", (e) => {
  if(confirm("Do you want to clear your list?"))
  {
    localStorage.removeItem("fav");
    ExistInFavoriteList();
  } 
});

/**************Trailers******************/
const newMovieTrailers = [
                            "https://www.youtube.com/embed/mqqft2x_Aa4",
                            "https://www.youtube.com/embed/yDDw4AG-TX8",
                            "https://www.youtube.com/embed/GBNKXNLm6ug",
                            "https://www.youtube.com/embed/CwpHlcb0G2s",
                            "https://www.youtube.com/embed/aJACneSF580",
                            "https://www.youtube.com/embed/cOv3Hk-6kt8"
                         ];

let trailerIFRAME = document.querySelector("#trailer");                         
let randomTrailer = newMovieTrailers.sort(() => Math.random() - Math.random()).slice(0, 1);

trailerIFRAME.src = randomTrailer + "?autoplay=0";
/*************Trailers END***************/


const DisplayError = ((err) => {
  messages.innerHTML = `
  <div class="alert alert-danger d-flex align-items-center" role="alert">
  <i class="bi bi-x-circle-fill" style="padding-right:10px"></i>
    <div>
      ${err}
    </div>
  </div>
`;
});

const RunToast = (() => {
    let option = { animation : true, delay : 9000,  autohide : true};

    var toastElList = [].slice.call(document.querySelectorAll('.toast'));
    var toastList = toastElList.map(function (toastEl) {
      return new bootstrap.Toast(toastEl, option).show();
    });
});

let preloader = document.querySelector(".preloader");
window.addEventListener("load", () => {
  preloader.style.display = "none";
})
  


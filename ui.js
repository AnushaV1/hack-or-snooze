$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navLogOut = $("#nav-logout");
  const $userProfile = $("#user-profile");
  const $navAddStory = $("#nav-add-story");
  const $navFavorites = $("#nav-favorites");
  const $myFavoriteArticles = $("#favorited-articles");
  
  const $myStories = $('#nav-my-stories');
  const $articlesContainer = $('.articles-container');

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;
  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();
         
    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();
    
    if(!name){
      $createAccountForm.focus();
    }


    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Submit article event handler.
   *
   * */

  $submitForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab all the info from the form
    const title = $("#title").val();
    const url = $("#url").val();
    const hostName = getHostName(url);
    const author = $("#author").val();
    const username = currentUser.username;

    const storyObject = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username
    });

    // generate markup for the new story
    const $li = $(`
      <li id="${storyObject.storyId}" class="id-${storyObject.storyId}">
        <span class="star">
          <i class="far fa-star"></i>
        </span>
        <a class="article-link" href="${url}" target="a_blank">
          <strong>${title}</strong>
        </a>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-author">by ${author}</small>
        <small class="article-username">posted by ${username}</small>
      </li>
    `);
    $allStoriesList.prepend($li);
    $allStoriesList.show();
    // hide the form and reset it
    $submitForm.slideUp("slow");
    $submitForm.trigger("reset");
  });
  
/**
   * Event Handler for Clicking Login
   */
$navLogin.on("click", function() {
  // Show the Login and Create Account Forms
  $loginForm.slideToggle();
  $createAccountForm.slideToggle();
  $allStoriesList.toggle();
});
  // Event handler for user profile, hides everything except profile
	$navUserProfile.on('click', function () {
		hideElements();
		$userProfile.show();
  });
  /**
 Event Handler for Add new stories 
 */
$navAddStory.on('click', function() {
  if(currentUser) {
    hideElements();
  // $allStoriesList.show();
  $submitForm.slideToggle();
  $userProfile.hide();
  $navWelcome.show();
  }
});
/**
   * Event handler for Navigation to Favorites
   */

  $("body").on("click", "#nav-favorites", function() {
    hideElements();
    if (currentUser) {
      generateFavorites();
     $myFavoriteArticles.show();
    }
  });
  
  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

/**
   * Event handler for Navigation to My Stories
   */
  $("body").on("click", "#nav-my-stories", function() {
    hideElements();
    if (currentUser) {
      $userProfile.hide();
      generateMyStories();
      $ownStories.show();
    }
  });
  
  /**
   * Starring favorites event handler
   *
   */
  
  $articlesContainer.on("click", ".star", async function(evt) {
    if (currentUser) {
     const $target = $(evt.target);
     const $closestLi = $target.closest("li");
     const storyId = $closestLi.attr("id");
     
    // if the item is already favorited
    if ($target.hasClass("fas")) {
      
      // remove the favorite from the user's list
      await currentUser.removeFavorite(storyId);
      // then change the class to be an empty star
      $target.closest("i").toggleClass("fas far");
    } else {
      // the item is un-favorited
     
      await currentUser.addFavorite(storyId);
      $target.closest("i").toggleClass("fas far");
      }
  }
  else {
    return;
  }
});

/**
   * Event handler for Deleting a single story
   */
  $ownStories.on("click", ".trash-can", async function(evt) {
    // get the Story's ID
    const $closestLi = $(evt.target).closest("li");
    const storyId = $closestLi.attr("id");

    // remove the story from the API
    await storyList.removeStory(currentUser, storyId);

    // re-generate the story list
    await generateStories();

    // hide everything
    hideElements();

    // show all stories list 
    $allStoriesList.show();
    
  });

 
  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();
    $userProfile.hide();
    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();
    // show user profile
    $userProfile.show();
    showProfile();
    // update the navigation bar
    showNavForLoggedInUser();
  }
/**
 *Add User's profile at bottom of page
 */
  function showProfile() {
    $('#profile-name').text(`Name: ${currentUser.name}`);
    $('#profile-username').text(`Username: ${currentUser.username}`);
    $('#profile-account-date').text(`Account created: ${currentUser.createdAt.slice(0,10)}`);
    $navUserProfile.text(`${currentUser.username}`);
  }


  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */
      function generateStoryHTML(story, isOwnStory) {
      let hostName = getHostName(story.url);
      let starType = isFavorite(story) ? 'fas' : 'far';
  
      //render a trash can for deleting your own story
      const trashIcon = isOwnStory
        ? `<span class="trash-can">
            <i class="fas fa-trash-alt"></i>
          </span>`
        : '';
  
      // render story markup
      const storyMarkup = $(`
        <li id="${story.storyId}">${trashIcon}<span class="star"><i class="${starType} fa-star"></i></span>
          <a class="article-link" href="${story.url}" target="a_blank">
            <strong>${story.title}</strong>
          </a> <small class="article-hostname ${hostName}">(${hostName})</small>
          <small class="article-author">by ${story.author}</small>
          <small class="article-username">posted by ${story.username}</small>
        </li>
      `);
  
      return storyMarkup;
    }
  
  /**
   * A rendering function to build the favorites list
   */

  function generateFavorites() {
    $myFavoriteArticles.empty();
      if(currentUser.favorites.length === 0){
        $myFavoriteArticles.append('<h4> No favorites added ! </h4>');
      }
      else {
        for(let story of currentUser.favorites) {
          let favoriteHTML = generateStoryHTML(story,false,true);
          $myFavoriteArticles.append(favoriteHTML);
        }
      }
    }
    /**
   * A rendering function to build the favorites list
   */
  function generateMyStories() {
    $ownStories.empty();

    // if the user has no stories that they have posted
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h4> No stories added by user </h4>");
    } else {
      // for all of the user's posted stories
      for (let story of currentUser.ownStories) {
        // render each story in the list
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }

    $ownStories.show();
  }

   
  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $userProfile,
      $loginForm,
      $myFavoriteArticles,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $(".main-nav-links").toggleClass("hidden");
    $navWelcome.show();
    $navLogOut.show();
  }
 /* see if a specific story is in the user's list of favorites */

 function isFavorite(story) {
  let favStoryIds = new Set();
  if (currentUser) {
    favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
  }
  return favStoryIds.has(story.storyId);
}
  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }  

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
      localStorage.setItem("createdAt", currentUser.createdAt);
      localStorage.setItem("name", currentUser.name);
    }
  }
});


  

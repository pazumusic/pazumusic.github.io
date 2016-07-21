$(() => {
  const questions = [
    { mindType: "ear", text: "I learn well by listening to others." },
    { mindType: "create", text: "I find myself daydreaming often." },
    { mindType: "eye", text: "I enjoy getting lost in a good book." },
    { mindType: "create", text: "I don't like it when rules and structure are in place." },
    { mindType: "ear", text: "I like to sing songs." },
    { mindType: "eye", text: "I enjoy writing in a journal or diary." },
    { mindType: "create", text: "I enjoy thinking of new ways to do simple tasks." },
    { mindType: "eye", text: "I love to navigate and read maps." },
    { mindType: "ear", text: "I find it easy to memorize melodies and lyrics." },
    { mindType: "tie-breaker", text: "If you were going to learn a song right now, which way would you prefer?" }
  ];
  const animEndEventNames = {
    "WebkitAnimation": "webkitAnimationEnd",
    "OAnimation": "oAnimationEnd",
    "msAnimation": "MSAnimationEnd",
    "animation": "animationend"
  };
  const strengths = {
    eye: [
      "Great at following directions",
      "Can easily visualize the notes",
      "Great sense of musical balance",
      "Notices small differences in written music"
    ],
    ear: [
      "Can easily remember melodies and lyrics",
      "Frequently humming or singing music",
      "Learns better while studying to music",
      "Prefers to find notes by listening rather than reading"
    ],
    create: [
      "Very imaginative and inventive",
      "Great sense of self awareness",
      "Enjoys finding new ways to sing or play songs",
      "Expression is always an important factor"
    ],
  };

  const $flickity = $(".main-carousel").flickity();
  const $progressBar = $(".progress-bar-fill");
  const $pages = $(".music-mind-container").children("div.music-mind-page");
  const $questionTemplate = $("#quiz-question-template");
  const $tiebreakTemplate = $("#tie-breaker-template");
  const $questionNumber = $("#question-number");
  const $nextQuestionButton = $("#next-question");
  const $prevQuestionButton = $("#prev-question");

  const PAGES_COUNT = $pages.length;
  const ORG_CLASS_LIST_DATA_KEY = "originalClassList";
  const PAGE_IDX_KEY = "pageIndex";

  var __debug_mode = true;
  var __debug = false;
  var isAnimating = false,
      endCurrPage = false,
      endNextPage = false,
      isRegistered = false,
      animEndEventName = animEndEventNames[Modernizr.prefixed("animation")],
      support = Modernizr.cssanimations;

  function init() {
    // App Init
    $pages.each((idx, elm) => {
      let $page = $(elm);
      $page.data(ORG_CLASS_LIST_DATA_KEY, $page.attr("class"));
      $page.data(PAGE_IDX_KEY, idx);

      if (idx === 0)
        $page.addClass("music-mind-page-current");
    });

    $(".music-mind-page-button").on('click', () => nextPage(onNextPageInitiated));

    // Quiz Init
    $(".answer-section input:radio").change(onQuizAnswerSelect);
    $prevQuestionButton.click(() => $flickity.flickity("previous"));
    $nextQuestionButton.click(() => $flickity.flickity("next"));

    $flickity.on("select.flickity", () => {
      let flickityState = $flickity.data("flickity");
      $questionNumber.text(`QUESTION #:${flickityState.selectedIndex + 1}`);
      $nextQuestionButton.prop("disabled", flickityState.selectedIndex == flickityState.cells.length - 1);
    });

    // CTA Init
    $("#signup-form").submit(onSubmit);
    $("#final-signup-form").submit(onSubmit);

    $("#no-button").click((e) => {
      e.preventDefault();
      nextPage(onNextPageInitiated);
    });

    // DEBUG - REMOVE ON DEPLOYMENT!
    if (__debug_mode) {
      $("#debug").click(() => {
        __debug = true;

        while ($flickity.data("flickity").cells.length < questions.length)
        {
          let $question = nextQuizQuestion();
          let $inputs = $question.find("input:radio");
          let randomAnswer = Math.floor(Math.random() * $inputs.length);
          $inputs.eq(randomAnswer).prop("checked", true);
        }

        nextPage();
        __debug = false;
      });
    }
    else {
      $("#debug").hide();
    }
  }

  // App Functions
  function nextPage(onAnimationBegCallback = null, onAnimationEndCallback = null, pageIndex = -1) {
    if (isAnimating) return false;
    isAnimating = true;

    let currentPageIndex = getCurrentPageIndex();
    let $currPage = $pages.eq(currentPageIndex);
    let nextPageIndex = pageIndex > -1
                          ? (pageIndex < PAGES_COUNT ? pageIndex : 0)
                          : (currentPageIndex < PAGES_COUNT - 1 ? currentPageIndex + 1 : 0);
    let $nextPage = $pages.eq(nextPageIndex).addClass("music-mind-page-current");
    let outClass = nextPageIndex > currentPageIndex ? "moveToTop" : "moveToBottom";
    let inClass = nextPageIndex > currentPageIndex ? "moveFromBottom" : "moveFromTop";

    if (onAnimationBegCallback)
      onAnimationBegCallback(currentPageIndex, nextPageIndex);

    $currPage.addClass(outClass).on(animEndEventName, () => {
      $currPage.off(animEndEventName);
      endCurrPage = true;
      if (endNextPage)
        onEndAnimation($currPage, $nextPage, onAnimationEndCallback);
    });

    $nextPage.addClass(inClass).on(animEndEventName, () => {
      $nextPage.off(animEndEventName);
      endNextPage = true;
      if (endCurrPage)
        onEndAnimation($currPage, $nextPage, onAnimationEndCallback);
    });

    if (!support)
      onEndAnimation($currPage, $nextPage, onAnimationEndCallback);
  }

  function getCurrentPageIndex() {
    return parseInt($(".music-mind-page-current").data(PAGE_IDX_KEY));
  }

  function onEndAnimation($outpage, $inpage, callback) {
    endCurrPage = false;
    endNextPage = false;
    resetPage($outpage, $inpage);
    isAnimating = false;

    if (callback)
      callback();
  }

  function resetPage($outpage, $inpage) {
    $outpage.attr("class", $outpage.data(ORG_CLASS_LIST_DATA_KEY));
    $inpage.attr("class", $inpage.data(ORG_CLASS_LIST_DATA_KEY) + " music-mind-page-current");
  }

  function onNextPageInitiated(currentPageIndex, nextPageIndex) {
    switch (nextPageIndex) {
      case 1:
        nextQuizQuestion();
        break;
      case 3:
        displayResults();
        break;
      case 4:
        if (isRegistered) {
          $("#final-cta").hide();
          $("#final-message").show();
        }
        break;
      default:
        break;
    }
  }

  // Quiz Functions
  function nextQuizQuestion() {
    let furthestQuestion = $flickity.data("flickity").cells.length;
    let question = questions[furthestQuestion];
    let progress = ((questions.length - furthestQuestion) / questions.length) * 100;
    let $cell = createQuizQuestion(furthestQuestion + 1, question.text, question.mindType);

    $flickity.flickity("append", $cell);
    $flickity.flickity("next");
    $progressBar.animate({ "width": `${100-progress}%` }, "slow");

    return $cell;
  }

  function createQuizQuestion(number, question, mindType) {
    let $question = (mindType === "tie-breaker" ? $tiebreakTemplate : $questionTemplate).clone().show();
    let nameAttr = mindType === "tie-breaker" ? "tie-breaker-answer" : `question-${number}-answer`;

    $question.find("h2").text(`Question ${number}`);
    $question.find("p").text(question);
    $question.find("div.answer-section").addClass(mindType).find("input:radio").each((idx, elm) =>
      $(elm).change(onQuizAnswerSelect).attr("name", nameAttr)
    );

    return $question;
  }

  function onQuizAnswerSelect(e) {
    let inputName = $(e.currentTarget).attr("name");
    if (inputName === "tie-breaker-answer") {
      nextPage();
    }
    else {
      window.setTimeout(nextQuizQuestion, 1000);
    }
  }

  function calculateResults() {
    let sum = (prev, curr) => prev + curr;
    let gatherInputs = (typeSelector) => $(`${typeSelector} input:checked`).map((i, input) =>
      parseInt($(input).val())
    ).get();

    return {
      eye: gatherInputs(".eye").reduce(sum),
      ear: gatherInputs(".ear").reduce(sum),
      create: gatherInputs(".create").reduce(sum)
    };
  }

  function getMusicMindResults() {
    let tieBreaker = $("div.tie-breaker input:checked").val();
    let results = calculateResults();
    results[tieBreaker]++;

    let mindType = Object.keys(results).reduce((prevVal, currVal) => {
      return results[prevVal] > results[currVal] ? prevVal : currVal;
    });

    return {
      mindType: mindType,
      breakdown: results
    };
  }

  function displayResults() {
    let results = getMusicMindResults();

    for (var key in results.breakdown)
      $(`#${key}-result`).text(results.breakdown[key]);

    $(".music-mind-result").text(results.mindType);
    strengths[results.mindType].forEach((item) => $("#strengths-list").append(`<li>${item}</li>`));
  }

  // CTA Functions
  function isValidEmail(email) {
    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    return regex.test(email);
  }

  function register($form, onSuccess, onError) {
    let results = getMusicMindResults();
    let url = "https://pazumusic.us13.list-manage.com/subscribe/post-json?u=97e39215ad5ad59c825210614&id=855559e5b6";
    let data = $form.serialize() + `&MMIND=${results.mindType}`;

    $.get({
      url: url,
      data: data,
      cache: false,
      dataType: "jsonp",
      jsonp: "c",
      contentType: "application/json; charset=utf-8",
      error: (err) => alert("Could not connect to the registration server. Please try again later."),
      success: (data) => data.result != "success" ? onError() : onSuccess()
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    let $form = $(e.currentTarget);
    let $emailField = $form.find("input[name=EMAIL]");
    let $errMessage = $form.find("#error-response");

    if (!isValidEmail($emailField.val())) {
      $emailField.css("border", "1px solid #ff0000");
      $errMessage.show();
      return;
    }
    else {
      $emailField.css("border", "1px solid #aaa");
      $errMessage.hide();
      register($form, () => {
        isRegistered = true;
        nextPage(onNextPageInitiated);
      });
    }
  }

  init();
});

"use strict";

$(function () {
  var questions = [{ mindType: "ear", text: "I learn well by listening to others." }, { mindType: "create", text: "I find myself daydreaming often." }, { mindType: "eye", text: "I enjoy getting lost in a good book." }, { mindType: "create", text: "I don't like it when rules and structure are in place." }, { mindType: "ear", text: "I like to sing songs." }, { mindType: "eye", text: "I enjoy writing in a journal or diary." }, { mindType: "create", text: "I enjoy thinking of new ways to do simple tasks." }, { mindType: "eye", text: "I love to navigate and read maps." }, { mindType: "ear", text: "I find it easy to memorize melodies and lyrics." }, { mindType: "tie-breaker", text: "If you were going to learn a song right now, which way would you prefer?" }];
  var animEndEventNames = {
    "WebkitAnimation": "webkitAnimationEnd",
    "OAnimation": "oAnimationEnd",
    "msAnimation": "MSAnimationEnd",
    "animation": "animationend"
  };
  var strengths = {
    eye: ["Great at following directions", "Can easily visualize the notes", "Great sense of musical balance", "Notices small differences in written music"],
    ear: ["Can easily remember melodies and lyrics", "Frequently humming or singing music", "Learns better while studying to music", "Prefers to find notes by listening rather than reading"],
    create: ["Very imaginative and inventive", "Great sense of self awareness", "Enjoys finding new ways to sing or play songs", "Expression is always an important factor"]
  };

  var $flickity = $(".main-carousel").flickity();
  var $progressBar = $(".progress-bar-fill");
  var $pages = $(".music-mind-container").children("div.music-mind-page");
  var $questionTemplate = $("#quiz-question-template");
  var $tiebreakTemplate = $("#tie-breaker-template");
  var $questionNumber = $("#question-number");
  var $nextQuestionButton = $("#next-question");
  var $prevQuestionButton = $("#prev-question");

  var PAGES_COUNT = $pages.length;
  var ORG_CLASS_LIST_DATA_KEY = "originalClassList";
  var PAGE_IDX_KEY = "pageIndex";

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
    $pages.each(function (idx, elm) {
      var $page = $(elm);
      $page.data(ORG_CLASS_LIST_DATA_KEY, $page.attr("class"));
      $page.data(PAGE_IDX_KEY, idx);

      if (idx === 0) $page.addClass("music-mind-page-current");
    });

    $(".music-mind-page-button").on('click', function () {
      return nextPage(onNextPageInitiated);
    });

    // Quiz Init
    $(".answer-section input:radio").change(onQuizAnswerSelect);
    $prevQuestionButton.click(function () {
      return $flickity.flickity("previous");
    });
    $nextQuestionButton.click(function () {
      return $flickity.flickity("next");
    });

    $flickity.on("select.flickity", function () {
      var flickityState = $flickity.data("flickity");
      $questionNumber.text("QUESTION #:" + (flickityState.selectedIndex + 1));
      $nextQuestionButton.prop("disabled", flickityState.selectedIndex == flickityState.cells.length - 1);
    });

    // CTA Init
    $("#signup-form").submit(onSubmit);
    $("#final-signup-form").submit(onSubmit);

    $("#no-button").click(function (e) {
      e.preventDefault();
      nextPage(onNextPageInitiated);
    });

    // DEBUG - REMOVE ON DEPLOYMENT!
    if (__debug_mode) {
      $("#debug").click(function () {
        __debug = true;

        while ($flickity.data("flickity").cells.length < questions.length) {
          var $question = nextQuizQuestion();
          var $inputs = $question.find("input:radio");
          var randomAnswer = Math.floor(Math.random() * $inputs.length);
          $inputs.eq(randomAnswer).prop("checked", true);
        }

        nextPage();
        __debug = false;
      });
    } else {
      $("#debug").hide();
    }
  }

  // App Functions
  function nextPage() {
    var onAnimationBegCallback = arguments.length <= 0 || arguments[0] === undefined ? null : arguments[0];
    var onAnimationEndCallback = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
    var pageIndex = arguments.length <= 2 || arguments[2] === undefined ? -1 : arguments[2];

    if (isAnimating) return false;
    isAnimating = true;

    var currentPageIndex = getCurrentPageIndex();
    var $currPage = $pages.eq(currentPageIndex);
    var nextPageIndex = pageIndex > -1 ? pageIndex < PAGES_COUNT ? pageIndex : 0 : currentPageIndex < PAGES_COUNT - 1 ? currentPageIndex + 1 : 0;
    var $nextPage = $pages.eq(nextPageIndex).addClass("music-mind-page-current");
    var outClass = nextPageIndex > currentPageIndex ? "moveToTop" : "moveToBottom";
    var inClass = nextPageIndex > currentPageIndex ? "moveFromBottom" : "moveFromTop";

    if (onAnimationBegCallback) onAnimationBegCallback(currentPageIndex, nextPageIndex);

    $currPage.addClass(outClass).on(animEndEventName, function () {
      $currPage.off(animEndEventName);
      endCurrPage = true;
      if (endNextPage) onEndAnimation($currPage, $nextPage, onAnimationEndCallback);
    });

    $nextPage.show();
    $nextPage.addClass(inClass).on(animEndEventName, function () {
      $nextPage.off(animEndEventName);
      endNextPage = true;
      if (endCurrPage) onEndAnimation($currPage, $nextPage, onAnimationEndCallback);
    });

    if (!support) onEndAnimation($currPage, $nextPage, onAnimationEndCallback);
  }

  function getCurrentPageIndex() {
    return parseInt($(".music-mind-page-current").data(PAGE_IDX_KEY));
  }

  function onEndAnimation($outpage, $inpage, callback) {
    endCurrPage = false;
    endNextPage = false;
    resetPage($outpage, $inpage);
    isAnimating = false;

    if (callback) callback();
  }

  function resetPage($outpage, $inpage) {
    $outpage.attr("class", $outpage.data(ORG_CLASS_LIST_DATA_KEY));
    $outpage.hide();
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
    var furthestQuestion = $flickity.data("flickity").cells.length;
    var question = questions[furthestQuestion];
    var progress = (questions.length - furthestQuestion) / questions.length * 100;
    var $cell = createQuizQuestion(furthestQuestion + 1, question.text, question.mindType);

    $flickity.flickity("append", $cell);
    $flickity.flickity("next");
    $progressBar.animate({ "width": 100 - progress + "%" }, "slow");

    return $cell;
  }

  function createQuizQuestion(number, question, mindType) {
    var $question = (mindType === "tie-breaker" ? $tiebreakTemplate : $questionTemplate).clone().show();
    var nameAttr = mindType === "tie-breaker" ? "tie-breaker-answer" : "question-" + number + "-answer";

    $question.find("h2").text("Question " + number);
    $question.find("p").text(question);
    $question.find("div.answer-section").addClass(mindType).find("input:radio").each(function (idx, elm) {
      return $(elm).change(onQuizAnswerSelect).attr("name", nameAttr);
    });

    return $question;
  }

  function onQuizAnswerSelect(e) {
    var inputName = $(e.currentTarget).attr("name");
    if (inputName === "tie-breaker-answer") {
      nextPage();
    } else {
      window.setTimeout(nextQuizQuestion, 1000);
    }
  }

  function calculateResults() {
    var sum = function sum(prev, curr) {
      return prev + curr;
    };
    var gatherInputs = function gatherInputs(typeSelector) {
      return $(typeSelector + " input:checked").map(function (i, input) {
        return parseInt($(input).val());
      }).get();
    };

    return {
      eye: gatherInputs(".eye").reduce(sum),
      ear: gatherInputs(".ear").reduce(sum),
      create: gatherInputs(".create").reduce(sum)
    };
  }

  function getMusicMindResults() {
    var tieBreaker = $("div.tie-breaker input:checked").val();
    var results = calculateResults();
    results[tieBreaker]++;

    var mindType = Object.keys(results).reduce(function (prevVal, currVal) {
      return results[prevVal] > results[currVal] ? prevVal : currVal;
    });

    var order = [];
    for (var key in results) {
      order.push([key, results[key]]);
    }

    order.sort(function(a, b) { return a[1] - b[1]; });

    var orderedResults = order.reduce(function (obj, val) {
      obj[val[0]] = val[1];
      return obj;
    }, {});

    return {
      mindType: mindType,
      breakdown: orderedResults
    };
  }

  function displayResults() {
    var results = getMusicMindResults();
    var cssClasses = ["small", "med", "large"];

    for (var key in results.breakdown) {
      $("#" + key + "-result").text(results.breakdown[key]);
      var cssClass = cssClasses.shift();
      $("#" + key + "-result").addClass(cssClass);
      $("#" + "li-" + key + "-result").addClass(cssClass);

      var mindTypeCssClass = results.mindType + '-' + cssClass;
    }

    $(".results-bar").addClass("results-" + results.mindType);
    $(".results-icon").addClass("white-" + results.mindType);
    $(".music-mind-result-icon").addClass("icon-" + results.mindType);
    $(".music-mind-result").append(results.mindType);
    strengths[results.mindType].forEach(function (item) {
      return $("#strengths-list").append("<li>" + item + "</li>");
    });
  }

  // CTA Functions
  function isValidEmail(email) {
    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    return regex.test(email);
  }

  function register($form, onSuccess, onError) {
    var results = getMusicMindResults();
    var url = "https://pazumusic.us13.list-manage.com/subscribe/post-json?u=97e39215ad5ad59c825210614&id=855559e5b6";
    var data = $form.serialize() + ("&MMIND=" + results.mindType);

    $.get({
      url: url,
      data: data,
      cache: false,
      dataType: "jsonp",
      jsonp: "c",
      contentType: "application/json; charset=utf-8",
      error: function error(err) {
        return alert("Could not connect to the registration server. Please try again later.");
      },
      success: function success(data) {
        return data.result != "success" ? onError() : onSuccess();
      }
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    var $form = $(e.currentTarget);
    var $emailField = $form.find("input[name=EMAIL]");
    var $errMessage = $form.find("#error-response");

    if (!isValidEmail($emailField.val())) {
      $emailField.css("border", "1px solid #ff0000");
      $errMessage.show();
      return;
    } else {
      $emailField.css("border", "1px solid #aaa");
      $errMessage.hide();
      register($form, function () {
        isRegistered = true;
        nextPage(onNextPageInitiated);
      });
    }
  }

  init();
});

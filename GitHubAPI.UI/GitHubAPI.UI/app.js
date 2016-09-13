(function () {

    /* FEATURES IMPLEMENTED 
     * 
     * Pseudo front end application which would let the users help list and browse top github projects conveniently
     * Implemented use of Web API to fetch problems detail
     * Implemented feature to Search (via language).
     * Implemented seek feature (to filter result through range of Stars given to repositories).
     * Implemented pagination of API results
     * Implemented lazy laod of results
     * Implemented app accent changer - very subtle, should not overpower content - find it top right corner of header - feature available in my portofolio
     * Implemented track of response Header X-RateLimit-Remaining / X-RateLimit-Limit - keep scrolling within a minute to mke around 10+ requests to the API
     * Implemented autocomplete feature to Search programming languages conveniently
     * 
     *      
     * GULP
     * AngularJS 1.5.8
     * Bootstrap
     * Underscore
     * jQuery
     * SCSS
     * 
     */

    function MainController($timeout, repoService, $mdToast) {
        var self = this;
        self.timeout = $timeout;
        self.repoService = repoService;
        self.mdToast = $mdToast;
        self.name = 'Asit Kumar Parida';
        self.header = document.getElementById('header');
        self.submarine = document.getElementById('pf_submarine');
        self.showColorPicker = false;
        self.settingsPaneColorsInitalized = false;
        self.colorModes = [
            { id: 'col0', colorId: "turquoise", name: "turquoise", code: "#1abc9c" },
            { id: 'col1', colorId: "emerland", name: "emerland", code: "#2ecc71" },
            { id: 'col2', colorId: "nephritis", name: "nephritis", code: "#27ae60" },
            { id: 'col3', colorId: "peterRiver", name: "peter river", code: "#3498db" },
            { id: 'col4', colorId: "wetAsphalt", name: "wet asphalt", code: "#34495e" },
            { id: 'col5', colorId: "amethyst", name: "amethyst", code: "#9b59b6" },
            { id: 'col6', colorId: "carrot", name: "carrot", code: "#e67e22" },
            { id: 'col7', colorId: "alizarin", name: "alizarin", code: "#e74c3c" },
            { id: 'col8', colorId: "pomegranate", name: "pomegranate", code: "#c0392b" }
        ];
        self.activeColorMode = self.colorModes[3];
        self.rateLimit = 1;
        self.maxRateLimit = null;
        self.minStars = 500;
        self.totalCount = 0;
        self.actievRateLimit = self.rateLimit;
        self.projects = [];
        self.selectedLanguage = 'JS';
        self.currentPage = 0;
        self.XRateLimitRemaining = 0;        
        self.fetchInProgress = false;
        self.sortPredicate = 'stars';
        self.sortOptions = [
            { id: 1, text: 'stars' },
            { id: 2, text: 'forks' },
            { id: 3, text: 'updated' }
        ];
        self.order = 'asc';
        self.orderOptions = [
            { id: 1, text: 'descending', val: 'desc' },
            { id: 2, text: 'ascending', val: 'asc' },
        ];

        self.fetchResults(self.selectedLanguage, self.minStars, self.sortPredicate, self.order, true);
        self.languages = self.repoService.getAllLanguages();

        var scrollIcon = document.getElementById('scrollUpIcon');
        var scrollContainer = document.getElementById('searchResultsContainer');
        var _lastScroll = 0;
        var _proceed = false;
        $(scrollContainer).on('scroll', function (e) {
            if ($(e.target)[0].scrollTop > _lastScroll) {
                var _toMatchHeight = $(e.target).height() + $(e.target)[0].scrollTop;
                var _matchToHeight = $(e.target)[0].scrollHeight;
                if (_matchToHeight - _toMatchHeight <= 60) {
                    if (self.fetchInProgress == false)
                        self.getNextPageResults();
                }
            }
            _lastScroll = $(e.target)[0].scrollTop;
            if (_lastScroll > 100)
                scrollIcon.style.display = 'block';
            else
                scrollIcon.style.display = 'none';
        });
    }
    MainController.prototype.scrollUp = function () {
        var scrollContainer = document.getElementById('searchResultsContainer');
        $(scrollContainer).animate({ scrollTop: 0 }, 100);
        document.getElementById('scrollUpIcon').style.display = 'none';
    }
    MainController.prototype.orderAsc = function () {
        var self = this;
        if (self.order != 'asc') {
            self.order = 'asc';
            self.fetchResults(self.activeLang, self.minStars, self.sortPredicate, self.order, true);
        }
    }
    MainController.prototype.orderDesc = function () {
        var self = this;
        if (self.order != 'desc') {
            self.order = 'desc';
            self.fetchResults(self.activeLang, self.minStars, self.sortPredicate, self.order, true);
        }
    }
    MainController.prototype.sortOptionChanged = function () {
        var self = this;
        self.fetchResults(self.activeLang, self.minStars, self.sortPredicate, self.order, true);
    }

    MainController.prototype.minStarsChanged = function () {
        var self = this;
        self.fetchResults(self.activeLang, self.minStars, self.sortPredicate, self.order, true);
    }

    MainController.prototype.openColorPicker = function () {
        var self = this;
        if (self.showColorPicker == false) {
            self.showColorPicker = true;
            self.settingsPaneColorsInitalized = true;
            self.shownColorModes = [];
            self.timeout(function () {
                angular.forEach(self.colorModes, function (cm, iter) {
                    self.shownColorModes.push(cm);
                    cm.transition = 'all ' + (50 + (150 * (iter + 1))) + 'ms' + ' ease-out';
                });
                angular.forEach(self.colorModes, function (cm, iter) {
                    self.timeout(function () {
                        var _elem = document.getElementById('color_' + cm.colorId);
                        _elem.style.transform = 'rotate(' + (-150 + (iter * 18)) + 'deg)';
                    }, 400);
                });
            }, 400);
        }
        else {
            self.showColorPicker = false;
            self.timeout(function () {
                self.settingsPaneColorsInitalized = false;
                self.shownColorModes = [];
            }, 300);
        }
    }

    MainController.prototype.closeColorPicker = function () {
        var self = this;
        self.showColorPicker = false;
        self.timeout(function () {
            self.settingsPaneColorsInitalized = false;
            self.shownColorModes = [];
        }, 300);
    }

    MainController.prototype.choseColor = function (color) {
        var self = this;
        self.activeColorMode = color;
    }

    MainController.prototype.insertProject = function (_project) {
        var self = this;
        self.projects.push({
            "id": _project.id,
            "name": _project.name,
            "html_url": _project.html_url,
            "full_name": _project.full_name,
            "description": _project.description,
            "stargazers_count": _project.stargazers_count
        });
    }

    MainController.prototype.toast = function (msg) {
        var self = this;
        if (!self.toastOn) {
            var toast = self.mdToast.simple()
            .textContent(msg)
            .action('CLOSE')
            .highlightAction(true)
            .highlightClass('md-accent')
            .position('bottom')
            .hideDelay(3000);
            self.toastOn = true;
            self.mdToast.show(toast)
            .then(function (data) {
                self.toastOn = false;
            }, function (data) {
                self.toastOn = false;
            });
        }
    }

    MainController.prototype.getNextPageResults = function () {
        var self = this;
        self.fetchResults(self.activeLang, self.minStars, self.sortPredicate, self.order, false);
    }

    MainController.prototype.fetchResults = function (lang, stars, sort, order, spinnerFlag) {
        var self = this;
        self.fetchInProgress = true;
        if (spinnerFlag) {
            document.getElementById('contentLoaderSpinner').style.display = 'block';
            self.projects = [];
        }

        if (self.activeLang == lang && self.activeMinStars == stars)
            self.currentPage = self.currentPage + 1;
        else
            self.currentPage = 0;
        self.activeLang = lang;
        self.activeMinStars = stars;
        self.repoService.get(self.activeLang, self.minStars, self.rateLimit, self.sortPredicate, self.order, self.currentPage)
            .then(function (response) {
                if (response.status == 200) {
                    self.XRateLimitRemaining = parseInt(response.headers()['x-ratelimit-remaining']);
                    if (!self.maxRateLimit) {
                        self.maxRateLimit = parseInt(response.headers()['x-ratelimit-limit']);
                        self.actievRateLimit = self.rateLimit = self.maxRateLimit;
                    }
                    if (response.data.total_count)
                        self.totalCount = response.data.total_count;
                    if (response.data.items && response.data.items.length > 0) {
                        angular.forEach(response.data.items, function (_dat) {
                            self.insertProject(_dat);
                        });
                    }
                    if (self.XRateLimitRemaining == 0) {
                        self.toast('API rate limit reached.');
                    }
                }
                if (response.status != 200) {
                    self.toast('API error. Please try again in a few minutes.');
                }
                document.getElementById('contentLoaderSpinner').style.display = 'none';
                self.fetchInProgress = false;
            });
    }

    MainController.prototype.rateLimitChange = function () {
        var self = this;

    }

    MainController.prototype.searchTextChange = function (item) {
        var self = this;
        self.languages = self.repoService.getLanguages(item);
    }

    MainController.prototype.selectedItemChange = function (item) {
        var self = this;
        if (typeof item !== 'undefined') {
            self.fetchResults(item, self.activeMinStars, self.sortPredicate, true);
        }
    }

    function RepoServiceDefnition(http) {
        var self = this;
        self.http = http;
        this.languages = ["A# .NET", "A# (Axiom)", "A-0 System", "A+", "A++", "ABAP", "ABC", "ABC ALGOL", "ABLE", "ABSET", "ABSYS", "ACC", "Accent", "Ace DASL", "ACL2", "ACT-III", "Action!", "ActionScript", "Ada", "Adenine", "Agda", "Agilent VEE", "Agora", "AIMMS", "Alef", "ALF", "ALGOL 58", "ALGOL 60", "ALGOL 68", "ALGOL W", "Alice", "Alma-0", "AmbientTalk", "Amiga E", "AMOS", "AMPL", "APL", "App Inventor for Android's visual block language", "AppleScript", "Arc", "ARexx", "Argus", "AspectJ", "Assembly language", "ATS", "Ateji PX", "AutoHotkey", "Autocoder", "AutoIt", "AutoLISP / Visual LISP", "Averest", "AWK", "Axum", "B", "Babbage", "Bash", "BASIC", "bc", "BCPL", "BeanShell", "Batch (Windows/Dos)", "Bertrand", "BETA", "Bigwig", "Bistro", "BitC", "BLISS", "Blue", "Bon", "Boo", "Boomerang", "Bourne shell", "bash", "ksh", "BREW", "BPEL", "C", "C--", "C++", "C#", "C/AL", "Caché ObjectScript", "C Shell", "Caml", "Candle", "Cayenne", "CDuce", "Cecil", "Cel", "Cesil", "Ceylon", "CFEngine", "CFML", "Cg", "Ch", "Chapel", "CHAIN", "Charity", "Charm", "Chef", "CHILL", "CHIP-8", "chomski", "ChucK", "CICS", "Cilk", "CL", "Claire", "Clarion", "Clean", "Clipper", "CLIST", "Clojure", "CLU", "CMS-2", "COBOL", "Cobra", "CODE", "CoffeeScript", "Cola", "ColdC", "ColdFusion", "COMAL", "Combined Programming Language", "COMIT", "Common Intermediate Language", "Common Lisp", "COMPASS", "Component Pascal", "Constraint Handling Rules", "Converge", "Cool", "Coq", "Coral 66", "Corn", "CorVision", "COWSEL", "CPL", "csh", "CSP", "Csound", "CUDA", "Curl", "Curry", "Cyclone", "Cython", "D", "DASL", "DASL", "Dart", "DataFlex", "Datalog", "DATATRIEVE", "dBase", "dc", "DCL", "Deesel", "Delphi", "DinkC", "DIBOL", "Dog", "Draco", "DRAKON", "Dylan", "DYNAMO", "E", "E#", "Ease", "Easy PL/I", "Easy Programming Language", "EASYTRIEVE PLUS", "ECMAScript", "Edinburgh IMP", "EGL", "Eiffel", "ELAN", "Elixir", "Elm", "Emacs Lisp", "Emerald", "Epigram", "EPL", "Erlang", "es", "Escapade", "Escher", "ESPOL", "Esterel", "Etoys", "Euclid", "Euler", "Euphoria", "EusLisp Robot Programming Language", "CMS EXEC", "EXEC 2", "Executable UML", "F", "F#", "Factor", "Falcon", "Fancy", "Fantom", "FAUST", "Felix", "Ferite", "FFP", "Fjölnir", "FL", "Flavors", "Flex", "FLOW-MATIC", "FOCAL", "FOCUS", "FOIL", "FORMAC", "@Formula", "Forth", "Fortran", "Fortress", "FoxBase", "FoxPro", "FP", "FPr", "Franz Lisp", "Frege", "F-Script", "FSProg", "G", "Google Apps Script", "Game Maker Language", "GameMonkey Script", "GAMS", "GAP", "G-code", "Genie", "GDL", "Gibiane", "GJ", "GEORGE", "GLSL", "GNU E", "GM", "Go", "Go!", "GOAL", "Gödel", "Godiva", "GOM (Good Old Mad)", "Goo", "Gosu", "GOTRAN", "GPSS", "GraphTalk", "GRASS", "Groovy", "Hack (programming language)", "HAL/S", "Hamilton C shell", "Harbour", "Hartmann pipelines", "Haskell", "Haxe", "High Level Assembly", "HLSL", "Hop", "Hope", "Hugo", "Hume", "HyperTalk", "IBM Basic assembly language", "IBM HAScript", "IBM Informix-4GL", "IBM RPG", "ICI", "Icon", "Id", "IDL", "Idris", "IMP", "Inform", "Io", "Ioke", "IPL", "IPTSCRAE", "ISLISP", "ISPF", "ISWIM", "J", "J#", "J++", "JADE", "Jako", "JAL", "Janus", "JASS", "Java", "JavaScript", "JCL", "JEAN", "Join Java", "JOSS", "Joule", "JOVIAL", "Joy", "JScript", "JScript .NET", "JavaFX Script", "Julia", "Jython", "K", "Kaleidoscope", "Karel", "Karel++", "KEE", "Kixtart", "KIF", "Kojo", "Kotlin", "KRC", "KRL", "KUKA", "KRYPTON", "ksh", "L", "L# .NET", "LabVIEW", "Ladder", "Lagoona", "LANSA", "Lasso", "LaTeX", "Lava", "LC-3", "Leda", "Legoscript", "LIL", "LilyPond", "Limbo", "Limnor", "LINC", "Lingo", "Linoleum", "LIS", "LISA", "Lisaac", "Lisp", "Lite-C", "Lithe", "Little b", "Logo", "Logtalk", "LPC", "LSE", "LSL", "LiveCode", "LiveScript", "Lua", "Lucid", "Lustre", "LYaPAS", "Lynx", "M2001", "M4", "Machine code", "MAD", "MAD/I", "Magik", "Magma", "make", "Maple", "MAPPER", "MARK-IV", "Mary", "MASM Microsoft Assembly x86", "Mathematica", "MATLAB", "Maxima", "Macsyma", "Max", "MaxScript", "Maya (MEL)", "MDL", "Mercury", "Mesa", "Metacard", "Metafont", "MetaL", "Microcode", "MicroScript", "MIIS", "MillScript", "MIMIC", "Mirah", "Miranda", "MIVA Script", "ML", "Moby", "Model 204", "Modelica", "Modula", "Modula-2", "Modula-3", "Mohol", "MOO", "Mortran", "Mouse", "MPD", "CIL", "MSL", "MUMPS", "NASM", "NATURAL", "Napier88", "Neko", "Nemerle", "nesC", "NESL", "Net.Data", "NetLogo", "NetRexx", "NewLISP", "NEWP", "Newspeak", "NewtonScript", "NGL", "Nial", "Nice", "Nickle", "Nim", "NPL", "Not eXactly C", "Not Quite C", "NSIS", "Nu", "NWScript", "NXT-G", "o:XML", "Oak", "Oberon", "Obix", "OBJ2", "Object Lisp", "ObjectLOGO", "Object REXX", "Object Pascal", "Objective-C", "Objective-J", "Obliq", "Obol", "OCaml", "occam", "occam-π", "Octave", "OmniMark", "Onyx", "Opa", "Opal", "OpenCL", "OpenEdge ABL", "OPL", "OPS5", "OptimJ", "Orc", "ORCA/Modula-2", "Oriel", "Orwell", "Oxygene", "Oz", "P#", "ParaSail (programming language)", "PARI/GP", "Pascal", "Pawn", "PCASTL", "PCF", "PEARL", "PeopleCode", "Perl", "PDL", "PHP", "Phrogram", "Pico", "Picolisp", "Pict", "Pike", "PIKT", "PILOT", "Pipelines", "Pizza", "PL-11", "PL/0", "PL/B", "PL/C", "PL/I", "PL/M", "PL/P", "PL/SQL", "PL360", "PLANC", "Plankalkül", "Planner", "PLEX", "PLEXIL", "Plus", "POP-11", "PostScript", "PortablE", "Powerhouse", "PowerBuilder", "PowerShell", "PPL", "Processing", "Processing.js", "Prograph", "PROIV", "Prolog", "PROMAL", "Promela", "PROSE modeling language", "PROTEL", "ProvideX", "Pro*C", "Pure", "Python", "Q (equational programming language)", "Q (programming language from Kx Systems)", "Qalb", "QtScript", "QuakeC", "QPL", "R", "R++", "Racket", "RAPID", "Rapira", "Ratfiv", "Ratfor", "rc", "REBOL", "Red", "Redcode", "REFAL", "Reia", "Revolution", "rex", "REXX", "Rlab", "RobotC", "ROOP", "RPG", "RPL", "RSL", "RTL/2", "Ruby", "RuneScript", "Rust", "S", "S2", "S3", "S-Lang", "S-PLUS", "SA-C", "SabreTalk", "SAIL", "SALSA", "SAM76", "SAS", "SASL", "Sather", "Sawzall", "SBL", "Scala", "Scheme", "Scilab", "Scratch", "Script.NET", "Sed", "Seed7", "Self", "SenseTalk", "SequenceL", "SETL", "Shift Script", "SIMPOL", "SIGNAL", "SiMPLE", "SIMSCRIPT", "Simula", "Simulink", "SISAL", "SLIP", "SMALL", "Smalltalk", "Small Basic", "SML", "Snap!", "SNOBOL", "SPITBOL", "Snowball", "SOL", "Span", "SPARK", "Speedcode", "SPIN", "SP/k", "SPS", "Squeak", "Squirrel", "SR", "S/SL", "Stackless Python", "Starlogo", "Strand", "Stata", "Stateflow", "Subtext", "SuperCollider", "SuperTalk", "Swift (Apple programming language)", "Swift (parallel scripting language)", "SYMPL", "SyncCharts", "SystemVerilog", "T", "TACL", "TACPOL", "TADS", "TAL", "Tcl", "Tea", "TECO", "TELCOMP", "TeX", "TEX", "TIE", "Timber", "TMG", "Tom", "TOM", "Topspeed", "TPU", "Trac", "TTM", "T-SQL", "TTCN", "Turing", "TUTOR", "TXL", "TypeScript", "Turbo C++", "Ubercode", "UCSD Pascal", "Umple", "Unicon", "Uniface", "UNITY", "Unix shell", "UnrealScript", "Vala", "VBA", "VBScript", "Verilog", "VHDL", "Visual Basic", "Visual Basic .NET", "Visual DataFlex", "Visual DialogScript", "Visual Fortran", "Visual FoxPro", "Visual J++", "Visual J#", "Visual Objects", "Visual Prolog", "VSXu", "Vvvv", "WATFIV, WATFOR", "WebDNA", "WebQL", "Windows PowerShell", "Winbatch", "Wolfram", "Wyvern", "X++", "X#", "X10", "XBL", "XC", "XMOS architecture", "xHarbour", "XL", "Xojo", "XOTcl", "XPL", "XPL0", "XQuery", "XSB", "XSLT", "XPath", "Xtend", "Yorick", "YQL", "Z notation", "Zeno", "ZOPL", "ZPL"];
    }

    RepoServiceDefnition.prototype.get = function (lang, minStars, rateLimit, sort, order, page) {
        var self = this;
        var uri = "https://api.github.com/search/repositories?q=stars:>=" + minStars + "&language:" + lang + "&sort=" + sort + "&order=" + order + "&page=" + page;
        console.log(uri);
        return self.http({
            url: encodeURI(uri),
            method: "GET"
        }).then(function (response) {
            if (!angular.isUndefined(response)) {
                return response;
            }
        }, function (response) {
            return response;
        });
    }

    RepoServiceDefnition.prototype.getLanguages = function (token) {
        return this.languages.filter(function (lang) {
            return lang.indexOf(token) != -1;
        });
    }

    RepoServiceDefnition.prototype.getAllLanguages = function () {
        return this.languages;
    }

    angular.module('TopGit.UI', ['ngAnimate', 'ngMaterial'])
   .service('TopGit.UI.SearchRepoService', ['$http', RepoServiceDefnition])
   .controller('TopGit.UI.MainController', ['$timeout', 'TopGit.UI.SearchRepoService', '$mdToast', MainController]);

})()
Array.prototype.index = function(val) {
    for (var i = 0, l = this.length; i < l; i++) {
        if (this[i] == val) return i;
    }

    return null;
};

Array.prototype.include = function(val) {
    return this.index(val) !== null;
};

Element.addMethods({
   getChildElementsByClassName: function(element, className) {
       return $(element).getElementsBySelector("." + className);

        var array = new Array();

        element.select("." + className).each(function(e) {
            if (e.parentNode == this) {
                array.push(e);
            }
        }.bind(element));

        return array;
   }
});

var EventDispatcher = Class.create({
    initialize: function() {
        this.tagsWithFuncs = {};
    },

    // Attach and event to the specified tag
    attachCallbackToEvent: function(tag, func) {
        var funcs = this.tagsWithFuncs[tag];

        if (funcs == null) {
           funcs = [];
           this.tagsWithFuncs[tag] = funcs;
        }

        funcs.push(func);
    },

    // Call the events that have been attached to the specified tag
    callEventsWithTag: function(tag, object) {
        var funcs = this.tagsWithFuncs[tag];

        if (funcs != null) {
            funcs.each(function(func) {
                func(object);
            });
        }
    }
});

var Drawers = Class.create(EventDispatcher, {
    options: {
        triggerClass: "drawer_trigger",
        contentClass: "drawer_content",
        activeClass: "active",
        animatingClass: "animating",
        hoverClass: "hover",
        initialDrawerClass: "drawer_initial",
        duration: 0.25,
        singleDrawer: false,
        initialDrawer: false,
        contentHeight: null,                             // if height is set then one drawer is always opened to maintain the height of the drawers
        drawerHeight: null,
        containerHeight: null,
        contentWidth: null,
        containerWidth: null,
        transition: Effect.Transitions.linear,
        showEvent: "click",
        hideEvent: "click",
        showEffect: Effect.BlindDown,
        hideEffect: Effect.BlindUp,
        orientation: "vertical",
        anchorTriggersSelector: "a.drawers",
        onAnimate: function() {},
        onAnimateComplete: function() {},
        wrapperIsTrigger: false
    },

    initialize: function(selector, options) {

        this.Instances = [];
        this.drawers = 0;

        // Since we can't use $super, we'll need to duplicate EventDispatcher.initialize here
        this.tagsWithFuncs = {};

        // setup a unique id for each drawer created
        this.id = "drawer" + this.drawers++;

        this.wrappers = $$(selector);

        if (this.wrappers.length < 1) return;

        this.options = Object.extend(Object.extend({ }, this.options), options || { });

        if (this.options.id != null) this.id = this.options.id;

        if (this.options.containerHeight != null || this.options.containerWidth != null) {
            this.options.singleDrawer = true;
            if (this.options.initialDrawer == false) {
                this.options.initialDrawer = true;
            }
        }

        if (typeof(this.options.initialDrawer) != "number" && this.options.initialDrawer == true) {
            this.options.initialDrawer = 0;
        }

        this.setupDrawers();
        this.getSizes();
        this.setSizes();
        this.hideContents();

        this.wrappers.each(function(wrapper) {
            if ($A(wrapper.classNames()).include(this.options.initialDrawerClass)) {
                this.options.initialDrawer = this.wrappers.index(wrapper);
            }
        }.bind(this));

        this.status = [];

        this.useQueryString();

        // open up initial drawer
        if (typeof(this.options.initialDrawer) == "number") {
            this.triggerContents(this.options.initialDrawer);
        }

        this.effects = [];

        this.setupAnchorTriggers();

        this.Instances.push(this);
    },

    setupAnchorTriggers: function() {
        this.anchors = $$(this.options.anchorTriggersSelector);

        // search through all anchors
        this.anchors.each(function(anchor) {
            var trigger;
            var drawerId = anchor.href.substring(anchor.href.indexOf("#") + 1);

            // find wrapper than has matching id as anchor href
            this.wrappers.each(function(wrapper) {
                if (wrapper.id == drawerId) {
                    trigger = this.triggers[this.wrappers.index(wrapper)];
                }
            }.bind(this));

            // make it clickable
            if (trigger) {
                anchor.observe('click', this.toggleContent.bind(this, trigger, false, this.options.singleDrawer, true));
            }
        }.bind(this));
    },

    triggerContents: function(index) {
        for (var i = 0; i < this.contents.length; i++) {
            var contents = this.contents[i];
            contents.each(function(content) {
                content.setStyle({ display: "none" });
                $(this.triggers[i].parentNode).removeClassName(this.options.activeClass);
                this.status[i] = false;
            }.bind(this));
        }

        var contents = this.contents[index];
        contents.each(function(content) {
            content.setStyle({
                display: "block"
            });
            $(this.triggers[index].parentNode).addClassName(this.options.activeClass);
            this.status[index] = true;
        }.bind(this));
    },

    openIfParentOf: function(element) {
        var result = null;

        this.wrappers.each(function(wrapper) {
            if (element.descendantOf(wrapper) || (wrapper == element)) {
                var index = this.wrappers.index(wrapper);
                this.triggerContents(index);
            }
        }.bind(this));

        return result;
    },

    useQueryString: function() {
        var url = window.location.toString();

        url.match(/\?(.+)$/);
        var params = RegExp.$1;

        var params = params.split("&");

        for(var i = 0; i < params.length; i++) {
            var tmp = params[i].split("=");
            if (tmp[0] == this.id) {
                this.options.initialDrawer = parseInt(tmp[1] - 1);

                if (i == params.length - 1) {
                    // scroll to if it is the last drawer
                    this.scrollToElement = this.wrappers[this.options.initialDrawer];
                }
            }
        }
    },

    contentSize: function(element) {
        switch (this.options.orientation) {
            case "vertical":
                if (this.options.containerHeight != null) return this.options.containerHeight - this.triggersSize().height;
                if (this.options.contentHeight != null) return this.options.contentHeight;
                if (this.options.drawerHeight != null) return this.options.drawerHeight - this.triggersSize().height;

                break;
            case "horizontal":
                if (this.options.containerWidth != null) return this.options.containerWidth - this.triggersSize().width;
                if (this.options.contentWidth != null) return this.options.contentWidth;
                if (this.options.drawerWidth != null) return this.options.drawerWidth - this.triggersSize().width;

                break;
        }

        return null;
    },

    hideContents: function() {
        this.contents.each(function(contents) {
            contents.each(function(content) {
                if (!content) return;
                content.hide();
            }.bind(this));
        }.bind(this));
    },

    getSizes: function() {
        this.sizes = [];
        this.contents.each(function(contents) {
            var contentSizes = [];

            contents.each(function(content) {
                contentSizes.push(this.contentSize(content));
            }.bind(this));

            this.sizes.push(contentSizes);
        }.bind(this));
    },

    setSizes: function() {
        this.contents.each(function(contents) {
            contents.each(function(content) {
                var size = this.sizes[this.contents.index(contents)][contents.index(content)];

                if (size != null) {
                    switch (this.options.orientation) {
                        case "vertical":
                            content.style.height = size + "px";
                            break;
                        case "horizontal":
                            content.style.width = size + "px";
                            content.childElements().first().style.width = size + "px";
                            break;
                    }
                }
            }.bind(this));
        }.bind(this));
    },

    setupDrawers: function() {
        this.triggers = [];
        this.contents = [];

        // loop through each toggle wrapper
        this.wrappers.each(function(wrapper) {
            var contents = new Array();

            // obtain content and triggers uses classes first
            var contentElements = wrapper.getChildElementsByClassName(this.options.contentClass);
            var triggerElements = wrapper.getChildElementsByClassName(this.options.triggerClass);

            // if can't find any then first child is trigger, second is content
            if (triggerElements.length == 0) triggerElements = [ wrapper.childElements().first() ];
            if (contentElements.length == 0) contentElements = [ wrapper.childElements()[1] ];

            // if we still can't find a trigger or content, then die
            if (triggerElements.first() == undefined) return;
            if (contentElements.first() == undefined) return;

            // hide each content initially
            contentElements.each(function(content) {
                if (this.options.orientation == "horizontal") {
                    content.setStyle({
                        float: "left",
                        overflow: "hidden",
                        display: "block"
                    });

                    var contentSizer = new Element("div");
                    contentSizer.setStyle({
                        float: "left",
                        overflow: "hidden"
                    });

                    var parent = $(content.parentNode);
                    contentSizer.appendChild(content);
                    parent.appendChild(contentSizer);

                    content = contentSizer;
                }

                contents.push(content);
            }.bind(this));

            if (this.options.wrapperIsTrigger) {
                var trigger = triggerElements[0];

                if (this.options.showEvent == this.options.hideEvent) {
                    wrapper.observe(this.options.showEvent, this.toggleContent.bind(this, trigger, null, this.options.singleDrawer, true));
                } else {
                    wrapper.observe(this.options.showEvent, this.toggleContent.bind(this, trigger, false, this.options.singleDrawer, true));

                    if (!this.options.singleDrawer) {
                        wrapper.observe(this.options.hideEvent, this.toggleContent.bind(this, trigger, true, this.options.singleDrawer, true));
                    }
                }
            }

            // setup trigger events
            triggerElements.each(function(trigger) {
                if (this.options.orientation == "horizontal") trigger.setStyle({ float: "left" });

                trigger.style.cursor = "pointer";

                if (!this.options.wrapperIsTrigger) {
                    if (this.options.showEvent == this.options.hideEvent) {
                        trigger.observe(this.options.showEvent, this.toggleContent.bind(this, trigger, null, this.options.singleDrawer, true));
                    } else {
                        trigger.observe(this.options.showEvent, this.toggleContent.bind(this, trigger, false, this.options.singleDrawer, true));

                        if (!this.options.singleDrawer) {
                            trigger.observe(this.options.hideEvent, this.toggleContent.bind(this, trigger, true, this.options.singleDrawer, true));
                        }
                    }
                }

                trigger.observe("mouseover", function(event) {
                    $(event.target.parentNode).addClassName(this.options.hoverClass);
                }.bind(this));

                trigger.observe("mouseout", function(event) {
                    $(event.target.parentNode).removeClassName(this.options.hoverClass);
                }.bind(this));

                this.triggers.push(trigger);
                this.contents.push(contents);
            }.bind(this));
        }.bind(this));
    },

    show: function(element, options) {
        this.effects.push(this.options.showEffect(element, options));
    },

    hide: function(element, options) {
        this.effects.push(this.options.hideEffect(element, options));
    },

    triggersSize: function() {
        var size = { width: 0, height: 0 };
        this.triggers.each(function(trigger) {
            size.width += trigger.getWidth();
            size.height += trigger.getHeight();
        });
        return size;
    },

    toggle: function(element, trigger, hide) {
        // each toggle has it's own effects queue
        var triggerIndex = this.triggers.index(trigger);
        var uniqueScope = "trigger" + triggerIndex;
        var options = {
            sync: true,
            transition: this.options.transition,
            scaleX: this.options.orientation == "horizontal",
            scaleY: this.options.orientation == "vertical",
            afterSetup: function(effect) {
              var hash = {};

              if ((arguments[1] || {}).scaleX) hash.width = "0px";
              if ((arguments[1] || {}).scaleY) hash.height = "0px";

              effect.element.makeClipping().setStyle(hash).show();
            }
        };

        var elementHidden = this.isHidden(element);
        var shown = false;
        var hidden = false;

        if (hide == null) {
            if (elementHidden) {
                this.show(element, options);
                shown = true;
            } else {
                if (this.options.containerHeight == null) {
                    this.hide(element, options);
                    hidden = true;
                } else {
                    return false;
                }
            }
        } else if (hide && !elementHidden) {
            this.hide(element, options);
            hidden = true;
        } else if (!hide && elementHidden) {
            this.show(element, options);
            shown = true;
        }

        if (elementHidden && $(trigger.parentNode).hasClassName(this.options.activeClass)) {
            $(trigger.parentNode).removeClassName(this.options.activeClass);
            trigger.removeClassName(this.options.activeClass);
            this.status[triggerIndex] = false;
        }

        if (hidden) {
            $(trigger.parentNode).removeClassName(this.options.activeClass);
            trigger.removeClassName(this.options.activeClass);
        }
        if (shown) {
            $(trigger.parentNode).addClassName(this.options.activeClass);
            trigger.addClassName(this.options.activeClass);
        }

        return false;
    },

    isHidden: function(element) {
        return element.style.display == "none";
    },

    toggleContent: function(trigger, hide, hideOthers, runEffect) {
        //if (Effect.Queues.get(this.id).size() != 0) return false;
        var testSizes;
        if (this.options.orientation == "vertical") {
            testSize = this.options.containerHeight;
        } else {
            testSize = this.options.containerWidth;
        }

        if (testSize != null && hideOthers && ($(trigger.parentNode).hasClassName(this.options.activeClass) || this.status[this.triggers.index(trigger)])) return;

        if (hideOthers == true) {
            Effect.Queues.get(this.id).each(function(effect){
                effect.cancel();
            });
        }

        var index = this.triggers.index(trigger);

        if (runEffect) this.effects = [];
        if (this.isHidden(this.contents[index].first())) {
            if (hideOthers) this.hideAll(false);
        }

        // toggle all contents related to the trigger
        this.contents[index].each(this.toggle.bindAsEventListener(this, trigger, hide));
        if (runEffect) this.doEffects();

        return false;
    },

    doEffects: function() {
        new Effect.Parallel(
            this.effects, {
                queue: { position: "end", scope: this.id },
                duration: this.options.duration,
                limit: 1,
                beforeStart: function(effect) {
                    effect.effects.each(function(effect) {
                        var trigger = this.findTrigger(effect.element);
                        $(trigger.parentNode).addClassName(this.options.animatingClass);

                        var triggerIndex = this.triggers.index(trigger);

                        this.status[triggerIndex] = true;
                    }.bindAsEventListener(this));
                }.bindAsEventListener(this),
                afterUpdate: function(effect) {
                    // Call callback function
                    this.options.onAnimate();
                }.bindAsEventListener(this),
                afterFinish: function(effect) {
                    effect.effects.each(function(effect) {
                        var trigger = this.findTrigger(effect.element);
                        $(trigger.parentNode).removeClassName(this.options.animatingClass);

                        var triggerIndex = this.triggers.index(trigger);

                        this.status[triggerIndex] = false;
                    }.bindAsEventListener(this));

                    this.setSizes();

                    // Call callback function
                    this.options.onAnimateComplete();
                }.bindAsEventListener(this)
            }
        );
    },

    _toggleAll: function(hide, runEffects) {
        if (Effect.Queues.get(this.id).size() != 0) return false;
        if (runEffects == null) runEffects = true;

        if (runEffects) this.effects = [];
        this.triggers.each(this.toggleContent.bindAsEventListener(this, hide, null, false));
        if (runEffects) this.doEffects();

        return false;
    },

    // toggle all toggles based on the first triggers active-ness
    toggleAll: function(runEffects) {
        var hide = $(this.triggers.first().parentNode).hasClassName(this.options.activeClass);
        this._toggleAll(hide, runEffects);
        return false;
    },

    showAll: function(runEffects) {
        this._toggleAll(false, runEffects);
        return false;
    },

    hideAll: function(runEffects) {
        this._toggleAll(true, runEffects);
        return false;
    },

    findTrigger: function(content) {
        var trigger;
        this.contents.each(function(contents) {
            contents.each(function(_content) {
                if (content == _content) {
                    trigger = this.triggers[this.contents.index(contents)];
                }
            }.bind(this));
        }.bind(this));
        return trigger;
    },

    check: function() {
        var elements = $$(window.location.hash);

        // check if we have another element to scroll to
        if (this.scrollToElement) elements.push(this.scrollToElement);

        if (elements.length != 0) {
            var element = elements[0];

            this.Instances.each(function(instance) {
                instance.openIfParentOf(element);
            });

            var position = element.cumulativeOffset();
            window.scrollTo(position[0], position[1]);
            this.callEventsWithTag(Drawers.Events.Check, this);
        }
    }

});

Drawers.Events = {
  "Check": "Drawers.Events.Check"
};
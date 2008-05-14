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
        var array = new Array();

        element.select("." + className).each(function(e) {
            if (e.parentNode == this) {
                array.push(e);
            }
        }.bind(element));

        return array;
   }
});

var Drawers = Class.create();

Drawers.DefaultOptions = {
  triggerClass: "drawer_trigger",
  contentClass: "drawer_content",
  activeClass: "active",
  hoverClass: "hover",
  duration: 0.5,
  singleDrawer: false,
  initialDrawer: false,
  height: null,                             // if height is set then one drawer is always opened as to maintain the height of the drawers
  transition: Effect.Transitions.linear,
  showEvent: "click",
  hideEvent: "click",
  showEffect: Effect.BlindDown,
  hideEffect: Effect.BlindUp
};

Drawers.drawers = 0;

Drawers.prototype = {
    initialize: function(selector, options) {
        // setup a unique id for each drawer created
        this.id = "drawer" + Drawers.drawers++;

        this.wrappers = $$(selector);
        
        if (this.wrappers.length < 1) return;

        this.options = Object.extend(Object.extend({}, Drawers.DefaultOptions), options || {});

        // if height is set then singleDrawer and initialDrawer must be set
        if (this.options.height != null) {
            this.options.singleDrawer = true;
            if (this.options.initialDrawer == false) {
                this.options.initialDrawer = true;
            }
        }

        if (typeof(this.options.initialDrawer) != "number" && this.options.initialDrawer == true) this.options.initialDrawer = 0;

        this.setupDrawers();
        this.getHeights();
        this.setHeights();
        this.hideContents();

        // open up initial drawer
        if (typeof(this.options.initialDrawer) == "number") {
            var contents = this.contents[this.options.initialDrawer];
            contents.each(function(content) {
                content.setStyle({
                    display: "block"
                });
                this.triggers[this.options.initialDrawer].parentNode.classNames().add(this.options.activeClass);
            }.bind(this));
        }

        this.effects = [];
    },

    contentHeight: function(element) {
        return (this.options.height != null) ? this.options.height - this.triggersSize().height : element.scrollHeight;
    },

    hideContents: function() {
        this.contents.each(function(contents) {
            contents.each(function(content) {
                content.hide();
          }.bind(this));
        }.bind(this));
    },

    getHeights: function() {
        this.heights = [];
        this.contents.each(function(contents) {
            var contentHeights = [];

            contents.each(function(content) {
                var height = this.contentHeight(content);
                if (content.style.display != "none") {
                    content.style.height = height + "px";
                    contentHeights.push(height);
                }
            }.bind(this));

            this.heights.push(contentHeights);
        }.bind(this));
    },

    setHeights: function() {
        this.contents.each(function(contents) {
            contents.each(function(content) {
                var height = this.heights[this.contents.index(contents)][contents.index(content)];
                content.style.height = height + "px";
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

            // hide each content initially

            contentElements.each(function(content) {
                contents.push(content);

                var contentHolder = new Element("div");

                content.childElements().each(function(e) {
                    contentHolder.appendChild(e);
                });

                content.appendChild(contentHolder);
            }.bind(this));

            // setup trigger events
            triggerElements.each(function(trigger) {
                trigger.style.cursor = "pointer";

                if (this.options.showEvent == this.options.hideEvent) {
                    trigger.observe(this.options.showEvent, this.toggleContent.bind(this, trigger, null, this.options.singleDrawer, true));
                } else {
                    trigger.observe(this.options.showEvent, this.toggleContent.bind(this, trigger, false, this.options.singleDrawer, true));
                    trigger.observe(this.options.hideEvent, this.toggleContent.bind(this, trigger, true, this.options.singleDrawer, true));
                }

                trigger.observe("mouseover", function(event) {
                    event.target.parentNode.classNames().add(this.options.hoverClass);
                }.bind(this));

                trigger.observe("mouseout", function(event) {
                    event.target.parentNode.classNames().remove(this.options.hoverClass);
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
        var uniqueScope = "trigger" + this.triggers.index(trigger);
        var options = {
            sync: true,
            transition: this.options.transition
        };

        var elementHidden = this.isHidden(element);
        var shown = false;
        var hidden = false;

        if (hide == null) {
            if (elementHidden) {
                this.show(element, options);
                shown = true;
            } else {
                if (this.options.height == null) {
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

        if (hidden) {
            trigger.parentNode.classNames().remove(this.options.activeClass);
        }
        if (shown) {
            trigger.parentNode.classNames().add(this.options.activeClass);
        }

        return false;
    },

    isHidden: function(element) {
        return element.style.display == "none";
    },

    toggleContent: function(trigger, hide, hideOthers, runEffect) {
        //if (Effect.Queues.get(this.id).size() != 0) return false;
        if (hideOthers && trigger.parentNode.classNames().include(this.options.activeClass)) return;
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
                afterFinish: function() {
                    this.setHeights();
                }.bind(this)
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
        var hide = this.triggers.first().parentNode.classNames().include(this.options.activeClass);
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
    }
};
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
  triggerClass: "toggle_trigger",
  contentClass: "toggle_content",
  activeClass: "toggle_active",
  duration: 0.5,
  singleDrawer: false,
  initialDrawer: false,
  height: null,                             // if height is set then one drawer is always opened as to maintain the height of the drawers
  transition: Effect.Transitions.sinoidal,
  showEvent: "onclick",
  hideEvent: "onclick"
};

Drawers.drawers = 0;

Drawers.prototype = {
    initialize: function(selector, options) {
        // setup a unique id for each drawer created
        this.id = "drawer" + Drawers.drawers++;
        
        this.wrappers = $$(selector);
        
        this.options = Object.extend(Object.extend({}, Drawers.DefaultOptions), options || {});
            
        // if height is set then singleDrawer and initialDrawer must be set
        if (this.options.height != null) {
            this.options.singleDrawer = true;
            if (this.options.initialDrawer == false) {
                this.options.initialDrawer = true;
            }
        }
        
        if (typeof(this.options.initialDrawer) != "number" && this.options.initialDrawer == true) this.options.initialDrawer = 0;
        
        this.setupDraws();
        
        // open up initial drawer
        if (typeof(this.options.initialDrawer) == "number") {
            var contents = this.contents[this.options.initialDrawer];
            contents.each(function(content) {
                content.setStyle({
                    height: this.contentHeight(content) + "px"
                });
                this.triggers[this.options.initialDrawer].classNames().add(this.options.activeClass);
            }.bind(this));
        }
        
        this.effects = [];
    },
    
    contentHeight: function(element) {
        return (this.options.height != null) ? this.options.height - this.triggersSize().height : element.scrollHeight;
    },
    
    setupDraws: function() {     
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
                content.setStyle({
                    overflow: "hidden",
                    height: "0px"
                });
                
                contents.push(content);
            }.bind(this));
            
            // setup trigger events
            triggerElements.each(function(trigger) {
                trigger.style.cursor = "pointer";
                
                if (this.options.showEvent == this.options.hideEvent) {
                    trigger[this.options.showEvent] = this.toggleContent.bind(this, trigger, null, this.options.singleDrawer, true);
                } else {
                    trigger[this.options.showEvent] = this.toggleContent.bind(this, trigger, false, this.options.singleDrawer, true);
                    trigger[this.options.hideEvent] = this.toggleContent.bind(this, trigger, true, this.options.singleDrawer, true);
                }
                
                this.triggers.push(trigger);
                this.contents.push(contents);
            }.bind(this));        
        }.bind(this));
    },
    
    show: function(element, options) {
		Object.extend(options, { scaleFrom: 0 });
		
		this.effects.push(new Effect.Scale(element, 100, options));
    },
    
    hide: function(element, options) {
		Object.extend(options, { scaleFrom: 100 });
		
		this.effects.push(new Effect.Scale(element, 0, options));
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
            scaleContent: false,
			transition: this.options.transition,
			scaleY: true,
			scaleX: false,
			scaleMode: { 
				originalHeight: this.contentHeight(element),
				originalWidth: element.scrollWidth
		}};
        
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
            trigger.classNames().remove(this.options.activeClass);
        }
        if (shown) {
            trigger.classNames().add(this.options.activeClass);
        }
        
        return false;
    },
    
    isHidden: function(element) {
        return element.getHeight() == 0;
    },
    
    toggleContent: function(trigger, hide, hideOthers, runEffect) {
        if (Effect.Queues.get(this.id).size() != 0) return false;
        
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
                limit: 1
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
        var hide = this.triggers.first().classNames().include(this.options.activeClass);
        this._toggleAll(hide, runEffects);
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
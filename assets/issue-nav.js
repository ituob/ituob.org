/* Vocabulary:
 * Section: e.g. General or Amendments; a group of messages.
 * Message: message as it is.
 */

(function () {

  initStickyIssueNavigation();

  function initStickyIssueNavigation() {
    let sectionMenu = makeMenu();
    sectionMenu.setItems(buildSectionMenu());

    let messageMenu = makeMenu();
    messageMenu.setItems([]);

    function handleMessageVisibilityChange(entries) {
      // Most of the time IntersectionObserver reports current entry correctly;
      // however, in some scrolling situations it fires but the currently intersecting item
      // on the top is not among the entries, so we have to fall back manual check.
      const currentMessageEl = getTopIntersectingEntry(entries) || goFigureCurrentMessage(sectionMenu.getItems());

      if (currentMessageEl) {
        const messageTitle = getMenuItemTitleForMessage(currentMessageEl);
        sectionMenu.selectItemContainingSubitemWithTitle(messageTitle);
        messageMenu.setItems(sectionMenu.getSelectedItem().items);
        messageMenu.selectItemByTitle(messageTitle);
      } else {
        messageMenu.setItems([]);
      }
    }

    const messageObserver = new IntersectionObserver((entries, observer) => { 
      handleMessageVisibilityChange(entries);
    }, {
      rootMargin: '10px 0px -90% 0px',
    });

    observeMessages(messageObserver, sectionMenu.getItems());

    var menuBar = document.createElement('nav');
    menuBar.classList.add('with-js');
    menuBar.classList.add('fixable-bar');
    menuBar.appendChild(sectionMenu.wrapper);
    menuBar.appendChild(messageMenu.wrapper);

    document.querySelector('body > main').
      insertBefore(menuBar, document.querySelector('body > main > .toc'));

    window.addEventListener('scroll', function () {
      const tocRect = document.querySelector('nav.toc').getBoundingClientRect();
      if (tocRect.bottom < 0) {
        menuBar.classList.add('fixed');
      } else {
        menuBar.classList.remove('fixed');
      }
    });

  }


  /* Creates an object encapsulating menu-related behaviors (coupled to DOM). */

  function makeMenu() {
    var items = [];
    var selectedItem = null;

    var wrapper = document.createElement('div');
    wrapper.classList.add('menu-wrapper');

    var trigger = document.createElement('div');
    trigger.classList.add('trigger');
    wrapper.appendChild(trigger);

    var ul = document.createElement('ul');
    wrapper.appendChild(ul);

    // Public methods

    function setItems(newItems) {
      if (newItems.length > 0) {
        items = newItems;

        while (ul.hasChildNodes()) {
          ul.removeChild(ul.firstChild);
        }
        for (let item of items) {
          var li = document.createElement('li');
          li.textContent = item.title;
          li.setAttribute('data-item-id', item.id);
          li.addEventListener('click', function() {
            item.el.scrollIntoView({ behavior: 'smooth' });
          });
          ul.appendChild(li);
        }
      }
      _selectItem(null);
    }

    function selectItemByTitle(title) {
      for (let item of items) {
        if (item.title === title) {
          _selectItem(item);
          break;
        }
      }
    }

    function selectItemContainingSubitemWithTitle(title) {
      for (let item of items) {
        for (let subitem of item.items) {
          if (subitem.title === title) {
            _selectItem(item);
            break;
          }
        }
      }
    }

    // Private

    function _selectItem(item) {
      selectedItem = item;

      if (item) {
        Array.from(ul.children).
          forEach(el => el.classList.remove('selected'));
        Array.from(ul.children).
          filter(el => el.matches('[data-item-id=' + item.id + ']'))[0].classList.add('selected');
        trigger.textContent = item.title;
      }
    }

    trigger.addEventListener('click', (evt) => {
      wrapper.classList.toggle('expanded');
    });


    return {

      getItems: function () { return items; },
      getSelectedItem: function () { return selectedItem; },

      setItems: setItems,
      selectItemByTitle: selectItemByTitle,
      selectItemContainingSubitemWithTitle: selectItemContainingSubitemWithTitle,

      wrapper: wrapper,

    }
  }


  /* Utility functions */

  // Given IntersectionObserver instance, and an iterable of section menu items,
  // starts observing the DOM element corresponding to each message in each section.
  function observeMessages(iObserver, sectionMenuItems) {
    function _observe() {
      for (let item of sectionMenuItems) {
        for (let message of item.items) {
          iObserver.observe(message.el);
        }
      }
    }
    _observe();
  }

  // Iterating over sections & messages, determines
  // which message is currently current (the user is scrolling through it).
  function goFigureCurrentMessage(sections) {
    for (let section of sections) {
      for (let message of section.items) {
        const rect = message.el.getBoundingClientRect();
        if (rect.top < 100 && rect.bottom > 0) {
          return message.el;
        }
      }
    }

    return null;
  }

  // Given a list of Intersection Observer entries, returns DOM element
  // of the entry that is the first visible from the top of the viewport.
  function getTopIntersectingEntry(entries) {
    const intersectingEntries = entries.filter(e => e.isIntersecting);

    if (intersectingEntries.length > 0) {
      const topItem = intersectingEntries.reduce((previous, current) => {
        return (previous.boundingClientRect.top < current.boundingClientRect.top) ? previous : current;
      });
      return topItem.target;
    }

    return null;
  }

  function getMenuItemTitleForSection(element) {
    return Array.from(element.children).
      filter(e => e.matches('h3'))[0].textContent;
  }

  function getMenuItemTitleForMessage(element) {
    return Array.from(element.children).
      filter(e => e.matches('header'))[0].querySelector('.title').textContent;
  }

  function buildSectionMenu() {
    var items = [];
    for (let sectionEl of document.querySelectorAll('main > section')) {
      if (sectionEl.hasAttribute('id')) {  // Exclude items without anchor
        items.push({
          title: getMenuItemTitleForSection(sectionEl),
          id: sectionEl.getAttribute('id'),
          el: sectionEl,
          items: buildMessageMenuForSection(sectionEl),
        });
      }
    }
    return items;
  }

  function buildMessageMenuForSection(element) {
    var items = [];
    Array.from(element.children).
        filter(e => e.matches('article')).
        forEach(messageEl => {
      if (messageEl.hasAttribute('id')) {  // Exclude items without anchor
        items.push({
          title: getMenuItemTitleForMessage(messageEl),
          id: messageEl.getAttribute('id'),
          el: messageEl,
        });
      }
    });
    return items;
  }

}());

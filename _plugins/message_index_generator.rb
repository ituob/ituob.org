module Jekyll

  MESSAGE_INDICES = {
    # In addition to configuration hash specified here,
    # a layout named "message_index-<index ID>" is expected to exist
    # for each index.

    'by-pub-amended' => {
      'title' => 'Amendments to ITU-T Service Publication',
      'url_prefix' => 'amending-sp',
      'getter' => lambda { |msg, _|
        if msg['type'] == 'amendment'
          return msg['target']
        end
        return nil
      },
      'key_builder' => lambda { |val, issue_data|
        "#{val['publication']} (#{val['position_on'] or (issue_data['running_annexes'][val['publication']] or {})['position_on'] or '-'})"
      },
    },
    'by-rec' => {
      'title' => 'Messages complement to ITU-T Recommendation',
      'url_prefix' => 'complement-to-itu-t-r',
      'getter' => lambda { |msg, site|
        # For amendments, their related recommendation
        # is whatever recommendation the amended publication is complement to.
        if msg['type'] == 'amendment' and msg['target']['publication'] != nil
          pub = site.data['publications'][msg['target']['publication']]
          if pub
            pub_rec = pub['meta']['recommendation']
            return pub_rec
          end
        end
        # For other messages, their related recommendation
        # is either specified directly in message properties (e.g., for custom messages)
        # or in message type configuration.
        return msg['recommendation'] || site.config['message_types'][msg['type']]['recommendation']
      },
      'key_builder' => lambda { |val, issue_data| "#{val['code']}" },
    },
  }

  class MessageIndex < Page
    def initialize(site, base_dir, idx, key, meta, messages, past_years, year)
      @site = site
      @base = base_dir

      url_prefix = MESSAGE_INDICES[idx]['url_prefix']

      latest_year = !past_years.include?(year)
      if latest_year
        # Do not append year to archive page URL for latest year
        @dir = File.join('messages', "#{url_prefix} #{key}")
      else
        @dir = File.join('messages', "#{url_prefix} #{key}", year.to_s)
      end

      @name = "index.html"

      self.process(@name)

      self.data = {
        'layout' => "message_index-#{idx}",
        'years' => past_years,
        'year' => year,
        'latest_year' => latest_year,
        'meta' => meta,
        'title' => MESSAGE_INDICES[idx]['title'],
        'index_id' => idx,
        'key' => key,
        'messages' => messages,
      }
    end
  end

  class Site

    def write_message_search_indices
      # Build a list of all messages across all issues
      issue_messages = []
      self.data['issue_ids_descending'].each do |issue_id|
        issue_data = self.data['issues'][issue_id]

        ['general', 'amendments'].each do |section|
          if issue_data[section]
            issue_data[section]['messages'].each.with_index(1) do |msg, idx|
              issue_messages << {
                'issue_id' => issue_id,
                'issue_data' => issue_data,
                'msg' => msg,
                'anchor' => "#{section}-#{idx}",
              }
            end
          end
        end
      end

      self.data['message_indices'] = {}

      MESSAGE_INDICES.each do |idx, config|
        keys = {}
        issue_messages.each do |item|
          val = config['getter'].call(item['msg'], self)
          next if val == nil

          key = config['key_builder'].call(val, item['issue_data'])
          keys[key] ||= {
            'meta' => val,
            'items' => [],
          }
          keys[key]['items'] << item
        end

        keys.each do |key, data|
          self.write_message_index(idx, key, data['meta'], data['items'])
        end

        self.data['message_indices'][idx] = keys
      end
    end

    def write_message_index(idx, key, meta, matches)
      matches_per_year = {}

      matches.each do |match|
        year = match['issue_data']['meta']['publication_date'].year
        matches_per_year[year] ||= []
        matches_per_year[year] << match
      end

      years_descending = matches_per_year.keys.sort_by(&:to_i).reverse()
      latest_year = years_descending.shift
      years_descending.each do |current_year|
        self.pages << MessageIndex.new(
          self,
          self.source,
          idx,
          key,
          meta,
          matches_per_year[current_year],
          years_descending,
          current_year)
      end

      self.pages << MessageIndex.new(
        self,
        self.source,
        idx,
        key,
        meta,
        matches_per_year[latest_year],
        years_descending,
        latest_year)
    end
  end


  class PublicationAmendmentIndexGenerator < Generator
    safe true
    priority :low

    def generate(site)
      site.write_message_search_indices
    end
  end

end

const {
  Alert,
  Button,
  Col,
  Container,
  Form,
  InputGroup,
  Nav,
  NavItem,
  Row,
  Table,
  Modal,
  Breadcrumb,
  ListGroup,
  Navbar,
} = ReactBootstrap

class NamespacesList extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      namespaces: [],
      columns: ['Namespace'],
      sorting: null,
      direction: true
    }

    this.getNamespaces();
    this.changeSorting = this.changeSorting.bind(this)
    this.updateFilter = this.updateFilter.bind(this)
  }

  changeSorting(column) {
    const direction = this.state.sorting === column ? !this.state.direction : true;
    const namespaces = this.state.namespaces.sort(
      direction
        ? (a, b) => a[column] > b[column] ? 1 : -1
        : (a, b) => a[column] < b[column] ? 1 : -1
    )
    console.log(column, direction)
    this.setState({ namespaces, sorting: column, direction })
  }

  getNamespaces() {
    fetch("api/namespaces")
      .then(response => response.json())
      .then((namespaces) => {
        this.setState({ namespaces, originalNamespaces: namespaces, columns: getColumns(namespaces) })
      })
  }

  componentDidUpdate(props, state) {
    if (props.filter !== this.props.filter) {
      this.updateFilter()
    }
  }

  updateFilter() {
    let namespaces
    if (this.props.filter) {
      const filter = new RegExp(this.props.filter, 'i')
      namespaces = this.state.originalNamespaces.filter((el) => {
        return filter.test(el.Namespace)
      })
    } else {
      namespaces = this.state.originalNamespaces
    }
    this.setState({ namespaces })
  }

  render() {
    return (
      <Table>
        <thead>
          <tr>
            {this.state.columns.map(column => (
              <th style={{ cursor: 'pointer' }} onClick={() => this.changeSorting(column)}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {this.state.namespaces.map((namespace, ind) => (
            <tr style={{ cursor: 'pointer' }} onClick={() => this.props.onSelect(namespace.Namespace)}>
              {this.state.columns.map(column => (
                <td>
                  {typeof namespace[column] == "boolean"
                    ? (<Form.Check type="checkbox" disabled checked={namespace[column]}></Form.Check>)
                    : namespace[column]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    )
  }
}

class GlobalTop extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      globals: [],
      columns: ['Name', 'Location', 'Collation']
    }
    this.getGlobals();
    this.updateFilter = this.updateFilter.bind(this)
    this.getSize = this.getSize.bind(this)
  }

  getGlobals() {
    fetch("api/globals/" + encodeURI(this.props.namespace))
      .then(response => response.json())
      .then((globals) => {
        const columns = getColumns(globals)
        this.setState({ globals, originalGlobals: globals, columns })
      })
  }

  componentDidUpdate(props, state) {
    if (props.filter !== this.props.filter) {
      this.updateFilter()
    }
  }

  updateFilter() {
    let globals
    if (this.props.filter) {
      const filter = this.props.filter.toLowerCase()
      globals = this.state.originalGlobals.filter((el) => {
        const values = [el.Name, el.Collation, el.Location]
        return values.find(v => v.toLowerCase().includes(filter))
      })
    } else {
      globals = this.state.originalGlobals
    }
    this.setState({ globals })
  }

  getSize(location, global) {
    if (location.startsWith('^^')) {
      location = location.substr(2)
    }
    const body = JSON.stringify({
      directory: location,
      global,
    })

    fetch("api/size", {
      method: 'POST',
      body,
    })
      .then(response => response.json())
      .then((data) => {
        const { directory: location, global, size } = data
        const globals = this.state.globals.map(el => {
          if ((!el.Location || el.Location === location) && el.Name === global) {
            el.Size = size
          }
          return el
        })
        this.setState({ globals, originalGlobals: globals })
      })
  }

  renderColumn(row, column) {
    switch (column) {
      case 'Name': return <a onClick={() => this.props.onSelect(row.Name)}>{row.Name}</a>
      case 'Size': return <a onClick={() => this.getSize(row.Location || this.props.namespace, row.Name)}>{row.Size >= 0 ? row.Size : "Size"}</a>
      default: {
        return typeof row[column] == "boolean"
          ? (<Form.Check type="checkbox" disabled checked={row[column]}></Form.Check>)
          : row[column]
      }
    }
  }

  render() {
    return (
      <Table>
        <thead>
          <tr>
            <th style={{ width: "1rem" }}><Form.Check type="checkbox"></Form.Check></th>
            {this.state.columns.map(column => (
              <th>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {this.state.globals.map((global, ind) => (
            <tr>
              <td><Form.Check type="checkbox"></Form.Check></td>
              {this.state.columns.map((column, i) => (
                <td>{this.renderColumn(global, column)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    )
  }
}

class GlobalData extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      globals: [],
      subscripts: [],
      lastNode: '',
    };

    this.getData()
    this.getData = this.getData.bind(this)
  }

  getData(reset = false, search="") {
    let mask = this.props.global
    if (this.state.subscripts.length) {
      mask += "(" + this.state.subscripts.join(",")
    }
    const namespace = this.props.namespace
    const lastNode = reset ? '' : this.state.lastNode
    const body = JSON.stringify({
      mask,
      namespace,
      lastNode,
      search,
    })
    fetch("api/data", {
      method: 'POST',
      body
    })
      .then(response => response.json())
      .then(data => {
        const { items, hasMore, lastNode } = data
        const globals = reset ? items : this.state.globals.concat(items)
        this.setState({ globals, hasMore, lastNode })
      })
  }

  componentDidUpdate(props, state) {
    if (!same(state.subscripts, this.state.subscripts)) {
      this.getData(true)
    }
    if (props.filter !== this.props.filter) {
      this.getData(true, this.props.filter)
    }
  }

  doSearch() {

  }

  globalName(global) {
    return global.Name
  }

  selectGlobal(global) {
    this.setState({ subscripts: [] })
  }

  selectSubs(subscripts) {
    this.setState({ subscripts })
  }

  render() {
    return (
      <>
        <Table className="globals">
          <tbody>
            <InfiniteScroll
              dataLength={this.state.globals.length}
              hasMore={this.state.hasMore}
              next={this.getData}
              loader={<h4>Loading...</h4>}
              endMessage={
                <p style={{ textAlign: 'center' }}>
                  <b>Yay! You have seen it all</b>
                </p>
              }
            >
              {this.state.globals.map((global) => (
                <tr>
                  <td>
                    <a onClick={() => this.selectGlobal(global.Subscripts[0])}>{global.Subscripts[0]}</a>
                    {global.Subscripts.length > 1 && (
                      <>
                        &#40;
                        {global.Subscripts.slice(1).map((sub, i) => [
                          i > 0 && ",",
                          <a onClick={() => this.selectSubs(global.Subscripts.slice(1, i + 2))}>{sub}</a>
                        ])}
                        &#41;
                      </>
                    )}
                  </td>
                  <td>&nbsp;=&nbsp;</td>
                  <td>{global.Value}</td>
                </tr>
              ))}
            </InfiniteScroll>
          </tbody>
        </Table>
      </>
    )
  }
}

class GlobalsView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      namespace: null,
      global: null,
      subscripts: null,
      ...this.readParams()
    };

    this.selectNamespace = this.selectNamespace.bind(this);
    this.selectGlobal = this.selectGlobal.bind(this);
    this.readParams = this.readParams.bind(this);

    self = this
    window.onpopstate = () => {
      self.setState(self.readParams())
    };
  }

  readParams() {
    const state = new Map()
    state.set('namespace', null)
    state.set('global', null)
    const searchParams = new URLSearchParams(document.location.search)
    searchParams.forEach((value, name) => {
      state.set(name, value)
    })
    return Object.fromEntries(state.entries())
  }

  selectNamespace(namespace) {
    this.setState({ namespace, global: null, subscripts: null, search: '' })
    updateParam('namespace', namespace)
    updateParam('global', null)
  }

  selectGlobal(global) {
    global = global ? global.split('(')[0] : global
    this.setState({ global, subscripts: null, search: '' })
    updateParam('global', global)
  }

  render() {
    return (
      <>
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container fluid>
            <Nav>
              <Nav.Item><Nav.Link onClick={() => { this.selectNamespace(null) }}>Namespaces</Nav.Link></Nav.Item>
              {this.state.namespace &&
                <Nav.Item ><Nav.Link onClick={() => { this.selectGlobal(null) }}>{this.state.namespace}</Nav.Link></Nav.Item>
              }
              {this.state.global &&
                <Nav.Item><Nav.Link disabled>{this.state.global}</Nav.Link></Nav.Item>
              }
            </Nav>
          </Container>
        </Navbar>
        <Navbar bg="light" expand="lg" sticky="top">
          <Container fluid>
            <InputGroup>
              <Form.Control value={this.state.search} placeholder="Filter" onChange={(e) => this.setState({ search: e.target.value })}></Form.Control>
              {/* <Button>Search</Button> */}
            </InputGroup>
          </Container>

        </Navbar>
        <Container fluid>
          {this.state.namespace
            ? (
              this.state.global
                ? <GlobalData namespace={this.state.namespace} filter={this.state.search} global={this.state.global} />
                : <GlobalTop namespace={this.state.namespace} filter={this.state.search} onSelect={(name) => this.selectGlobal(name)} />
            )
            : <NamespacesList filter={this.state.search} onSelect={(name) => this.selectNamespace(name)} />
          }
        </Container>
      </>
    )
  }
}

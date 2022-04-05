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

const globalState = {
  text: "foo",
};

class ModalDialog extends React.Component {
  render() {
    return (
      <Modal
        {...this.props}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            {this.props.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.props.children}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={(e) => this.props.onHide(e)}>Cancel</Button>
          <Button onClick={(e) => this.props.onOK(e)}>{this.props.buttonOk}</Button>
        </Modal.Footer>
      </Modal>
    )
  }
}

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
    this.free = this.free.bind(this)
  }

  changeSorting(column) {
    const direction = this.state.sorting === column ? !this.state.direction : true;
    const namespaces = this.state.namespaces.sort(
      direction
        ? (a, b) => a[column] > b[column] ? 1 : -1
        : (a, b) => a[column] < b[column] ? 1 : -1
    )
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

  free() {
    this.state.namespaces.forEach(el => {
      this.getFree(el.Namespace)
    })
  }

  getFree(directory) {
    if (directory.startsWith('^^')) {
      directory = directory.substr(2)
    }
    const body = JSON.stringify({
      directory,
    })

    fetch("api/free", {
      method: 'POST',
      body,
    })
      .then(response => response.json())
      .then((data) => {
        const { directory, free } = data
        const namespaces = this.state.namespaces.map(el => {
          if (el.Namespace === "^^" + directory) {
            el.Free = free
          }
          return el
        })
        this.setState({ namespaces, originalNamespaces: namespaces })
      })

  }

  renderColumn(row, column) {
    switch (column) {
      case 'Namespace': return <a onClick={() => this.props.onSelect(row.Namespace)}>{row.Namespace}</a>
      case 'Free': return row.Free === -2 ? <></> : (
        <a title={"Calculate"} onClick={() => this.getFree(row.Namespace)}>{row.Free >= 0 ? row.Free : "Free"}</a>
      )
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
            {this.state.columns.map(column => (
              <th style={{ cursor: 'pointer' }} onClick={() => this.changeSorting(column)}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {this.state.namespaces.map((namespace) => (
            <tr>
              {this.state.columns.map(column => <td>{this.renderColumn(namespace, column)}</td>)}
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
      columns: ['Name', 'Location', 'Collation'],
      system: this.props.system,
    }
    this.getGlobals();
    this.updateFilter = this.updateFilter.bind(this)
    this.getSize = this.getSize.bind(this)
    this.doExport = this.doExport.bind(this)

    this.size = this.size.bind(this)
    this.export = this.export.bind(this)
    this.system = this.system.bind(this)
    this.systemGet = this.systemGet.bind(this)
  }

  getGlobals() {
    const body = JSON.stringify({
      namespace: this.props.namespace,
      system: this.state.system,
    })

    fetch("api/globals", {
      'method': 'POST',
      body,
    })
      .then(response => response.json())
      .then((globals) => {
        const columns = getColumns(globals)
        this.setState({ globals, originalGlobals: globals, columns })
      })
  }

  systemGet() {
    return this.state.system
  }

  system(system) {
    this.setState({ system })
  }

  componentDidUpdate(props, state) {
    if (props.filter !== this.props.filter) {
      this.updateFilter()
    }
    if (state.system !== this.state.system) {
      this.getGlobals()
      localStorage.setItem('system', this.state.system)
    }
  }

  updateFilter() {
    let globals
    if (this.props.filter) {
      const filter = this.props.filter.toLowerCase()
      globals = this.state.originalGlobals.filter((el) => {
        const values = [el.Name, el.Collation, el.Location]
        return values.find(v => v && v.toLowerCase().includes(filter))
      })
    } else {
      globals = this.state.originalGlobals
    }
    this.setState({ globals })
  }

  changeSorting(column) {
    const direction = this.state.sorting === column ? !this.state.direction : true;
    const globals = this.state.globals.sort(
      direction
        ? (a, b) => a[column] > b[column] ? 1 : -1
        : (a, b) => a[column] < b[column] ? 1 : -1
    )
    this.setState({ globals, sorting: column, direction })
  }

  size() {
    this.state.globals.forEach(el => {
      this.getSize(el.Location || this.props.namespace, el.Name)
    })
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

  setForm(name, value) {
    const formData = this.state.formData
    formData[name] = value
    this.setState({ formData })
  }

  export() {
    if (this.state.globals.find(el => el.Selected)) {
      const formData = {
        format: 'xml',
        gzip: true,
      }
      this.setState({ exportDialog: true, formData })
    } else {
      alert('No globals were selected')
    }
  }

  doExport(_event) {
    const { format, gzip } = this.state.formData

    const namespace = this.props.namespace
    const globals = this.state.globals.filter(el => el.Selected).map(el => el.Name.split('(')[0])
    const body = JSON.stringify({
      namespace,
      globals,
      format,
      gzip,
    })

    fetch("api/export", {
      method: 'POST',
      body,
    }).then(async response => ({
      filename: response.headers.get('content-disposition').split('filename=')[1],
      blob: await response.blob(),
    }))
      .then(({ filename, blob }) => {
        var a = document.createElement("a");
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        a.click();
      })

    this.setState({ exportDialog: false, formData: null })
  }

  renderColumn(row, column) {
    switch (column) {
      case 'Name': return <a onClick={() => this.props.onSelect(row.Name)}>{row.Name}</a>
      case 'Size': return <a title={"Calculate Size"} onClick={() => this.getSize(row.Location || this.props.namespace, row.Name)}>{row.Size >= 0 ? row.Size : "Size"}</a>
      default: {
        return typeof row[column] == "boolean"
          ? (<Form.Check type="checkbox" disabled checked={row[column]}></Form.Check>)
          : row[column]
      }
    }
  }

  selectAll(checked) {
    const globals = this.state.globals.map(el => {
      el.Selected = checked
      return el
    })
    this.setState({ globals })
  }

  select(global, checked) {
    const globals = this.state.globals.map(el => {
      if (el.Name === global) {
        el.Selected = checked
      }
      return el
    })
    this.setState({ globals })
  }

  render() {
    return (
      <>
        <Table>
          <thead>
            <tr>
              <th style={{ width: "1rem" }}><Form.Check onChange={(e) => this.selectAll(e.target.checked)} type="checkbox"></Form.Check></th>
              {this.state.columns.map(column => (
                <>
                  {
                    column === 'Name' || column === 'Size'
                      ? <th style={{ cursor: 'pointer' }} onClick={() => this.changeSorting(column)}>{column}</th>
                      : <th>{column}</th>
                  }
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {this.state.globals.map((global, ind) => (
              <tr>
                <td><Form.Check type="checkbox" checked={global.Selected} onChange={(e) => this.select(global.Name, e.target.checked)} ></Form.Check></td>
                {this.state.columns.map((column, i) => (
                  <td>{this.renderColumn(global, column)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
        <ModalDialog
          show={this.state.exportDialog}
          size="lg"
          aria-labelledby="contained-modal-title-vcenter"
          buttonOk={"Export"}
          title={"Export"}
          onHide={() => this.setState({ exportDialog: false })}
          onOK={(_) => this.doExport()}
        >
          {this.state.formData && (
            <>
              <p>{`Export ${this.state.globals.filter(el => el.Selected).length} globals from ${this.props.namespace}`}</p>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={2}>Format</Form.Label>
                <Col>
                  <Form.Check
                    inline
                    label="XML"
                    type="radio"
                    name="exportFormat"
                    checked={this.state.formData.format === 'xml'}
                    onChange={() => { this.setForm('format', 'xml') }}
                  />
                  <Form.Check
                    inline
                    label="GOF"
                    type="radio"
                    name="exportFormat"
                    checked={this.state.formData.format === 'gof'}
                    onChange={() => { this.setForm('format', 'gof') }}
                  />
                </Col>
              </Form.Group>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={2}>GZip</Form.Label>
                <Col>
                  <Form.Check
                    type="checkbox"
                    checked={this.state.formData.gzip}
                    onChange={(e) => { this.setForm('gzip', e.target.checked) }}
                  />
                </Col>
              </Form.Group>
            </>
          )}
        </ModalDialog>
      </>
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
    this.levels = this.levels.bind(this)
  }

  levels(levels) {
    this.setState({ levels })
  }

  getData(reset = false, search = "") {
    let mask = this.props.global
    if (this.state.subscripts.length) {
      mask += "(" + this.state.subscripts.join(",")
    }
    if (this.state.levels) {
      const levels = this.state.levels.split(',')[0]
      mask += mask.includes('(') ? '' : '('
      mask += ','.repeat(levels)
      mask += this.state.levels.includes('*') ? '' : ')'
    }
    this.props.onMaskUpdate(mask)
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
    if (state.levels !== this.state.levels) {
      this.getData(true)
    }
    if (props.filter !== this.props.filter) {
      this.getData(true, this.props.filter)
    }
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
    this.mainRef = React.createRef();

    this.state = {
      namespace: null,
      global: null,
      subscripts: null,
      menu: {},
      ...this.readParams(),
      system: localStorage.getItem('system') === 'true',
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

  renderActions() {
    const actions = []
    if (this.state.namespace) {
      if (this.state.global) {
        actions.push(<Form.Select onChange={(e) => this.mainRef.current.levels(e.target.value)}>
          {Array(10).fill().map((_, i) => (
            <>
              <option>{i},*</option>
              <option>{i}</option>
            </>
          ))}
        </Form.Select>)
      } else {
        actions.push(<Form.Check
          className="nav-link"
          type="switch" label="System"
          checked={this.state.system}
          onChange={(e) => {
            this.mainRef.current.system(e.target.checked)
            this.setState({ system: e.target.checked })
          }} />)
        actions.push(<Nav.Link onClick={() => this.mainRef.current.size()}>Size</Nav.Link>)
        actions.push(<Nav.Link onClick={() => this.mainRef.current.export()}>Export</Nav.Link>)
      }
    } else {
      actions.push(<Nav.Link onClick={() => this.mainRef.current.free()}>Free</Nav.Link>)
    }
    return actions
  }

  render() {
    return (
      <>
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container fluid>
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Item><Nav.Link onClick={() => { this.selectNamespace(null) }}>Namespaces</Nav.Link></Nav.Item>
                {this.state.namespace &&
                  <Nav.Item ><Nav.Link onClick={() => { this.selectGlobal(null) }}>{this.state.namespace}</Nav.Link></Nav.Item>
                }
                {this.state.global &&
                  <Nav.Item><Nav.Link disabled>{this.state.mask || this.state.global}</Nav.Link></Nav.Item>
                }
              </Nav>
              <Nav>
                {this.renderActions()}
              </Nav>
            </Navbar.Collapse>
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
                ? <GlobalData
                  ref={this.mainRef}
                  namespace={this.state.namespace}
                  filter={this.state.search}
                  global={this.state.global}
                  onMaskUpdate={(mask) => this.setState({ mask })}
                />
                : <GlobalTop
                  ref={this.mainRef}
                  namespace={this.state.namespace}
                  filter={this.state.search}
                  system={this.state.system}
                  onSelect={(name) => this.selectGlobal(name)}
                />
            )
            : <NamespacesList ref={this.mainRef} filter={this.state.search} onSelect={(name) => this.selectNamespace(name)} />
          }
        </Container>
      </>
    )
  }
}
